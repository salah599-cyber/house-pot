"use server";

import { and, desc, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { grantHostRole, requireDbUser, requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { platformInvites, users } from "@/lib/db/schema";
import { createInviteToken, getAppUrl, getInviteExpiryDate } from "@/lib/invites";
import { describeEmailDeliveryIssue } from "@/lib/email";
import { rateLimitSendInvites } from "@/lib/rate-limit";
import { sendPlatformInviteNotification } from "@/server/notifications";

const inviteEmailSchema = z.object({
  email: z.string().email(),
  targetRole: z.enum(["player", "host"]).default("player"),
});

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
}: {
  email: string;
  invitedByUserId: string;
  inviterName: string;
  targetRole: "player" | "host";
}) {
  const normalizedEmail = email.toLowerCase();

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
      error: `${normalizedEmail} is already registered on House Poker.`,
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
    expiresAt: getInviteExpiryDate(),
  });

  const inviteLink = getAppUrl(`/invite/${token}`);
  const emailResult = await sendPlatformInviteNotification({
    email: normalizedEmail,
    userId: null,
    inviterName,
    inviteLink,
    targetRole,
  });

  return {
    success: true as const,
    immediate: false as const,
    token,
    inviteLink,
    emailWarning: describeEmailDeliveryIssue(emailResult),
  };
}

export async function inviteUsersByEmailAction(formData: FormData) {
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
  });

  if ("error" in result) {
    return result;
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
    };
  }

  return {
    success: true,
    message: result.immediate
      ? "Host role granted. A notification email was sent if email delivery is configured."
      : "Invite created and email sent.",
    inviteLink: result.inviteLink,
  };
}

export async function invitePlayersToPlatformAction(formData: FormData) {
  const host = await requireRole("host");

  const limited = await rateLimitSendInvites(host.id);
  if (!limited.success) {
    return { error: limited.error };
  }

  const emails = parseInviteEmails(String(formData.get("inviteEmails") ?? ""));
  if (emails.length === 0) {
    return { error: "Add at least one email address." };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  let sent = 0;

  for (const email of emails) {
    if (email === host.email.toLowerCase()) continue;

    const result = await createPlatformInviteForEmail({
      email,
      invitedByUserId: host.id,
      inviterName: host.displayName,
      targetRole: "player",
    });

    if ("error" in result && result.error) {
      errors.push(result.error);
      continue;
    }

    if ("emailWarning" in result && result.emailWarning) {
      warnings.push(`${email}: ${result.emailWarning}`);
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
    return { success: true, warning: `Sent ${sent} invite(s). Skipped: ${errors.join(" ")}` };
  }

  if (warnings.length > 0) {
    return {
      success: true,
      warning: `Created ${sent} invite(s), but email delivery had issues. Copy each invite link from Pending invites or configure RESEND_API_KEY in Vercel.`,
    };
  }

  return { success: true, message: `Sent ${sent} invite(s).` };
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
  const emailResult = await sendPlatformInviteNotification({
    email: invite.email,
    userId: null,
    inviterName: invite.invitedBy.displayName,
    inviteLink,
    targetRole: invite.targetRole === "host" ? "host" : "player",
  });

  const emailWarning = describeEmailDeliveryIssue(emailResult);
  if (emailWarning) {
    return { success: true, warning: emailWarning, inviteLink };
  }

  return { success: true, message: `Invite email resent to ${invite.email}.` };
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
