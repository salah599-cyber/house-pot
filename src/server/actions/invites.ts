"use server";

import { and, desc, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { APP_NAME } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { grantHostRole, getUserRoles, requireDbUser, requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { platformInvites, users } from "@/lib/db/schema";
import { describeEmailDeliveryIssue, shouldUseResendForEmail } from "@/lib/email";
import { ensureClerkInvitation } from "@/lib/clerk-invitations";
import { createInviteToken, getAppUrl, getInviteExpiryDate } from "@/lib/invites";
import { rateLimitSendInvites } from "@/lib/rate-limit";
import { sendPlatformInviteNotification } from "@/server/notifications";
import {
  normalizeWhatsAppPhone,
  parseInviteWhatsappPhones,
  whatsappPhoneAtIndex,
} from "@/lib/whatsapp";

const inviteEmailSchema = z.object({
  email: z.string().email(),
  targetRole: z.enum(["player", "host"]).default("player"),
});

type InviteActionResult =
  | { success: true; message: string; warning?: string; inviteLink?: string }
  | { error: string };

type PlatformInviteResult =
  | {
      success: true;
      immediate: true;
      userId: string;
      inviteLink: string;
      emailWarning: string | null;
    }
  | {
      success: true;
      immediate: false;
      token: string;
      inviteLink: string;
      emailWarning: string | null;
      emailDelivered: boolean;
    }
  | { error: string };

function parseInviteEmails(raw: string) {
  return [
    ...new Set(
      raw
        .split(/[\n,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

async function findPendingPlatformInvite(email: string) {
  return db.query.platformInvites.findFirst({
    where: and(
      eq(platformInvites.email, email),
      eq(platformInvites.status, "pending"),
      gt(platformInvites.expiresAt, new Date()),
    ),
  });
}

export async function createPlatformInviteForEmail({
  email,
  invitedByUserId,
  inviterName,
  targetRole,
  whatsappPhone: rawWhatsappPhone,
}: {
  email: string;
  invitedByUserId: string;
  inviterName: string;
  targetRole: "player" | "host";
  whatsappPhone?: string | null;
}): Promise<PlatformInviteResult> {
  const normalizedEmail = email.toLowerCase();
  const whatsappPhone = rawWhatsappPhone
    ? normalizeWhatsAppPhone(rawWhatsappPhone)
    : null;

  if (rawWhatsappPhone && !whatsappPhone) {
    return { error: `Invalid WhatsApp number for ${normalizedEmail}.` };
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (existingUser) {
    if (targetRole === "host") {
      await grantHostRole(existingUser.id);
      const emailResult = await sendPlatformInviteNotification({
        email: normalizedEmail,
        userId: existingUser.id,
        inviterName,
        inviteLink: getAppUrl("/host/dashboard"),
        targetRole: "host",
      });
      return {
        success: true as const,
        immediate: true as const,
        userId: existingUser.id,
        inviteLink: getAppUrl("/host/dashboard"),
        emailWarning: describeEmailDeliveryIssue(emailResult),
      };
    }

    return {
      error: `${normalizedEmail} is already registered on ${APP_NAME}.`,
    };
  }

  const pending = await findPendingPlatformInvite(normalizedEmail);
  if (pending) {
    return {
      error: `A pending invite already exists for ${normalizedEmail}.`,
    };
  }

  const token = createInviteToken();
  await db.insert(platformInvites).values({
    email: normalizedEmail,
    token,
    invitedByUserId,
    targetRole,
    whatsappPhone,
    expiresAt: getInviteExpiryDate(),
  });

  const inviteLink = getAppUrl(`/invite/${token}`);
  const clerkResult = await ensureClerkInvitation({
    emailAddress: normalizedEmail,
    redirectUrl: inviteLink,
    notify: true,
  });
  const clerkDelivered = "emailed" in clerkResult && clerkResult.emailed;

  const emailResult = shouldUseResendForEmail()
    ? await sendPlatformInviteNotification({
        email: normalizedEmail,
        userId: null,
        inviterName,
        inviteLink,
        targetRole,
      })
    : ({ status: "skipped", reason: "sandbox_sender" } as const);

  const emailDelivered =
    clerkDelivered || (emailResult.status === "sent");
  let emailWarning = describeEmailDeliveryIssue(emailResult);
  if (!emailDelivered) {
    if ("error" in clerkResult) {
      emailWarning =
        "Clerk could not send an invitation email. Copy the invite link and send it manually.";
    } else {
      emailWarning =
        "Invitation email could not be delivered. Copy the invite link and send it manually.";
    }
  } else if (clerkDelivered) {
    emailWarning = null;
  }

  return {
    success: true as const,
    immediate: false as const,
    token,
    inviteLink,
    emailWarning,
    emailDelivered: emailDelivered || ("emailed" in clerkResult && clerkResult.emailed),
  };
}

export async function inviteUsersByEmailAction(formData: FormData): Promise<InviteActionResult> {
  const admin = await requireRole("super_admin");

  const limited = await rateLimitSendInvites(admin.id);
  if (!limited.success) {
    return { error: limited.error };
  }

  const parsed = inviteEmailSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    targetRole: String(formData.get("targetRole") ?? "player"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const result = await createPlatformInviteForEmail({
    email: parsed.data.email,
    invitedByUserId: admin.id,
    inviterName: admin.displayName,
    targetRole: parsed.data.targetRole,
    whatsappPhone: String(formData.get("whatsappPhone") ?? "").trim() || null,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "invite_sent",
    entityType: "platform_invite",
    summary:
      result.immediate
        ? `Granted host role to ${parsed.data.email}`
        : `Sent ${parsed.data.targetRole} invite to ${parsed.data.email}`,
    metadata: {
      email: parsed.data.email,
      targetRole: parsed.data.targetRole,
      immediate: result.immediate,
    },
  });

  if (result.immediate) {
    await logAudit({
      actorUserId: admin.id,
      action: "role_granted",
      entityType: "user",
      entityId: result.userId,
      summary: "Granted host role via invite",
      metadata: { role: "host" },
    });
  }

  revalidatePath("/super-admin/invites");
  revalidatePath("/super-admin/users");

  if (result.emailWarning) {
    return {
      success: true,
      warning: result.emailWarning,
      inviteLink: result.inviteLink,
      message: result.immediate
        ? `Host access granted to ${parsed.data.email}, but email was not delivered.`
        : `Invite created for ${parsed.data.email}, but email was not delivered.`,
    };
  }

  return {
    success: true,
    message: result.immediate
      ? `Host access granted to ${parsed.data.email}.`
      : !result.immediate && "emailDelivered" in result && result.emailDelivered
        ? `${parsed.data.targetRole === "host" ? "Host" : "Player"} invite sent to ${parsed.data.email}.`
        : `Invite created for ${parsed.data.email}, but no email was delivered.`,
    inviteLink: result.inviteLink,
  };
}

export async function invitePlayersToPlatformAction(
  formData: FormData,
): Promise<InviteActionResult> {
  const host = await requireRole("host");

  const limited = await rateLimitSendInvites(host.id);
  if (!limited.success) {
    return { error: limited.error };
  }

  const emails = parseInviteEmails(String(formData.get("inviteEmails") ?? ""));
  const whatsappPhones = parseInviteWhatsappPhones(
    String(formData.get("inviteWhatsappPhones") ?? ""),
  );
  if (emails.length === 0) {
    return { error: "Add at least one email address." };
  }

  const errors: string[] = [];
  let sent = 0;
  let emailWarnings = 0;
  let emailsDelivered = 0;

  for (const [index, email] of emails.entries()) {
    if (email === host.email.toLowerCase()) continue;

    const result = await createPlatformInviteForEmail({
      email,
      invitedByUserId: host.id,
      inviterName: host.displayName,
      targetRole: "player",
      whatsappPhone: whatsappPhoneAtIndex(whatsappPhones, index),
    });

    if ("error" in result && result.error) {
      errors.push(result.error);
      continue;
    }

    if ("emailWarning" in result && result.emailWarning) {
      emailWarnings += 1;
    }
    if ("emailDelivered" in result && result.emailDelivered) {
      emailsDelivered += 1;
    }

    await logAudit({
      actorUserId: host.id,
      action: "invite_sent",
      entityType: "platform_invite",
      summary: `Sent player invite to ${email}`,
      metadata: { email, targetRole: "player" },
    });
    sent += 1;
  }

  revalidatePath("/host/invite");

  if (sent === 0) {
    return { error: errors[0] ?? "No invites were sent." };
  }

  if (errors.length > 0) {
    return {
      success: true,
      message: `Sent ${sent} invite(s). Skipped: ${errors.join(" ")}`,
      warning: `Sent ${sent} invite(s). Skipped: ${errors.join(" ")}`,
    };
  }

  if (emailWarnings > 0) {
    return {
      success: true,
      message:
        emailsDelivered > 0
          ? `Created ${sent} invite(s). ${emailsDelivered} email(s) sent.`
          : sent === 1
            ? "Invite created successfully."
            : `Created ${sent} invites successfully.`,
      warning:
        "Some invitation emails could not be delivered. Copy each invite link from Pending invites below, or configure RESEND_API_KEY in Vercel.",
    };
  }

  return {
    success: true,
    message:
      sent === 1
        ? emailsDelivered === 1
          ? "Invite email sent successfully."
          : "Invite created successfully."
        : `Sent ${sent} invite(s).`,
  };
}

export async function resendPendingInviteEmailAction(inviteId: string) {
  const admin = await requireRole("super_admin");

  const limited = await rateLimitSendInvites(admin.id);
  if (!limited.success) {
    return { error: limited.error };
  }

  const invite = await db.query.platformInvites.findFirst({
    where: and(
      eq(platformInvites.id, inviteId),
      eq(platformInvites.status, "pending"),
      gt(platformInvites.expiresAt, new Date()),
    ),
    with: { invitedBy: true },
  });

  if (!invite) {
    return { error: "Invite not found or expired." };
  }

  const inviteLink = getAppUrl(`/invite/${invite.token}`);
  const clerkResult = await ensureClerkInvitation({
    emailAddress: invite.email,
    redirectUrl: inviteLink,
    notify: true,
  });

  if ("emailed" in clerkResult && clerkResult.emailed) {
    return { success: true, message: `Invitation email resent to ${invite.email} via Clerk.` };
  }

  const emailResult = shouldUseResendForEmail()
    ? await sendPlatformInviteNotification({
        email: invite.email,
        userId: null,
        inviterName: invite.invitedBy.displayName,
        inviteLink,
        targetRole: invite.targetRole === "host" ? "host" : "player",
      })
    : ({ status: "skipped", reason: "sandbox_sender" } as const);

  const emailDelivered = emailResult.status === "sent";
  const emailWarning = describeEmailDeliveryIssue(emailResult);
  if (emailWarning && !emailDelivered) {
    return { success: true, warning: emailWarning, inviteLink };
  }

  return { success: true, message: `Invite email resent to ${invite.email}.` };
}

export async function resendHostPendingInviteEmailAction(inviteId: string) {
  const host = await requireRole("host");

  const limited = await rateLimitSendInvites(host.id);
  if (!limited.success) {
    return { error: limited.error };
  }

  const invite = await db.query.platformInvites.findFirst({
    where: and(
      eq(platformInvites.id, inviteId),
      eq(platformInvites.invitedByUserId, host.id),
      eq(platformInvites.status, "pending"),
      gt(platformInvites.expiresAt, new Date()),
    ),
  });

  if (!invite) {
    return { error: "Invite not found or expired." };
  }

  const inviteLink = getAppUrl(`/invite/${invite.token}`);
  const clerkResult = await ensureClerkInvitation({
    emailAddress: invite.email,
    redirectUrl: inviteLink,
    notify: true,
  });

  if ("emailed" in clerkResult && clerkResult.emailed) {
    return { success: true, message: `Invitation email resent to ${invite.email} via Clerk.` };
  }

  const emailResult = shouldUseResendForEmail()
    ? await sendPlatformInviteNotification({
        email: invite.email,
        userId: null,
        inviterName: host.displayName,
        inviteLink,
        targetRole: "player",
      })
    : ({ status: "skipped", reason: "sandbox_sender" } as const);

  const emailDelivered = emailResult.status === "sent";
  const emailWarning = describeEmailDeliveryIssue(emailResult);
  if (emailWarning && !emailDelivered) {
    return { success: true, warning: emailWarning, inviteLink };
  }

  return { success: true, message: `Invite email resent to ${invite.email}.` };
}

export async function getPendingPlatformInvitesForHost() {
  const host = await requireRole("host");

  return db.query.platformInvites.findMany({
    where: and(
      eq(platformInvites.invitedByUserId, host.id),
      eq(platformInvites.status, "pending"),
      gt(platformInvites.expiresAt, new Date()),
    ),
    orderBy: [desc(platformInvites.createdAt)],
    limit: 50,
  });
}

export async function getPendingPlatformInvites() {
  await requireRole("super_admin");

  return db.query.platformInvites.findMany({
    where: and(
      eq(platformInvites.status, "pending"),
      gt(platformInvites.expiresAt, new Date()),
    ),
    with: { invitedBy: true },
    orderBy: [desc(platformInvites.createdAt)],
    limit: 50,
  });
}

export async function revokePlatformInviteAction(inviteId: string) {
  const user = await requireDbUser();
  const roles = getUserRoles(user);
  const isAdmin = roles.includes("super_admin");
  const isHost = roles.includes("host");

  if (!isAdmin && !isHost) {
    return { error: "Unauthorized." };
  }

  const invite = await db.query.platformInvites.findFirst({
    where: and(
      eq(platformInvites.id, inviteId),
      eq(platformInvites.status, "pending"),
      gt(platformInvites.expiresAt, new Date()),
      ...(isAdmin ? [] : [eq(platformInvites.invitedByUserId, user.id)]),
    ),
  });

  if (!invite) {
    return { error: "Invite not found or already closed." };
  }

  await db
    .update(platformInvites)
    .set({ status: "declined" })
    .where(eq(platformInvites.id, invite.id));

  await logAudit({
    actorUserId: user.id,
    action: "invite_sent",
    entityType: "platform_invite",
    entityId: invite.id,
    summary: `Revoked platform invite for ${invite.email}`,
    metadata: { email: invite.email, revoked: true },
  });

  revalidatePath("/host/invite");
  revalidatePath("/super-admin/invites");
  return { success: true };
}
