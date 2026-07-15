"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getDefaultDashboardPath } from "@/lib/auth/roles";
import { logAudit } from "@/lib/audit";
import {
  clearPlatformInviteCookie,
  getPlatformInviteCookie,
} from "@/lib/auth/invite-cookie";
import {
  getDbUserByClerkId,
  getUserRoles,
  grantHostRole,
  grantPlayerRole,
  seedSuperAdminIfNeeded,
} from "@/lib/auth/session";
import { db } from "@/lib/db";
import { gameInvites, notifications, platformInvites, users } from "@/lib/db/schema";
import { getPlatformInviteByToken } from "@/lib/queries/invites";

export async function completeOnboardingAction(
  inviteToken?: string,
  gameToken?: string,
  setupToken?: string,
) {
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect("/sign-in");
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase() ??
    clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase();

  if (!email) {
    return { error: "A verified email address is required." };
  }

  const existing = await getDbUserByClerkId(userId);
  if (existing) {
    if (gameToken) {
      redirect(`/game-invite/${gameToken}`);
    }
    redirect(getDefaultDashboardPath(getUserRoles(existing)));
  }

  let inviteAccepted = false;
  let inviteTargetRole: "player" | "host" | null = null;
  let inviteWhatsappPhone: string | null = null;

  const inviteFromCookie = await getPlatformInviteCookie();
  const effectiveInviteToken = inviteToken ?? inviteFromCookie ?? undefined;

  if (effectiveInviteToken) {
    const invite = await getPlatformInviteByToken(effectiveInviteToken);
    if (invite && invite.status === "pending" && invite.expiresAt > new Date()) {
      if (invite.email.toLowerCase() !== email) {
        return {
          error: `This invite was sent to ${invite.email}, but you signed in as ${email}. Sign out and register with the invited email address.`,
        };
      }

      inviteAccepted = true;
      inviteTargetRole = invite.targetRole === "host" ? "host" : "player";
      inviteWhatsappPhone = invite.whatsappPhone ?? null;
      await db
        .update(platformInvites)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(platformInvites.id, invite.id));
    }
  }

  if (!inviteWhatsappPhone) {
    const pendingGameInvite = await db.query.gameInvites.findFirst({
      where: and(eq(gameInvites.email, email), isNull(gameInvites.userId)),
    });
    inviteWhatsappPhone = pendingGameInvite?.whatsappPhone ?? null;
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  const requiredSetupToken = process.env.SUPER_ADMIN_SETUP_TOKEN;
  const emailMatchesSuperAdmin = Boolean(superAdminEmail && email === superAdminEmail);
  const setupTokenValid =
    !requiredSetupToken || (setupToken && setupToken === requiredSetupToken);
  const isSuperAdminSeed = emailMatchesSuperAdmin && setupTokenValid;

  if (!inviteAccepted && !isSuperAdminSeed) {
    if (emailMatchesSuperAdmin && requiredSetupToken && !setupTokenValid) {
      return {
        error:
          "Super admin setup requires a valid setup token. Use the onboarding link provided during deployment.",
      };
    }

    return {
      error:
        "House Poker is invite-only. Ask a host for an invitation link before registering.",
    };
  }

  const displayName =
    clerkUser.fullName ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email.split("@")[0];

  const [user] = await db
    .insert(users)
    .values({
      clerkId: userId,
      email,
      displayName,
      whatsappPhone: inviteWhatsappPhone,
    })
    .returning();

  await grantPlayerRole(user.id);
  if (inviteTargetRole === "host") {
    await grantHostRole(user.id);
  }
  await seedSuperAdminIfNeeded(email, user.id);

  await db
    .update(notifications)
    .set({ userId: user.id })
    .where(and(eq(notifications.email, email), isNull(notifications.userId)));

  await db
    .update(gameInvites)
    .set({ userId: user.id })
    .where(and(eq(gameInvites.email, email), isNull(gameInvites.userId)));

  await logAudit({
    actorUserId: user.id,
    action: "user_registered",
    entityType: "user",
    entityId: user.id,
    summary: `User registered: ${email}`,
  });

  if (gameToken) {
    redirect(`/game-invite/${gameToken}`);
  }

  await clearPlatformInviteCookie();

  const refreshed = await getDbUserByClerkId(userId);
  redirect(getDefaultDashboardPath(refreshed ? getUserRoles(refreshed) : ["player"]));
}
