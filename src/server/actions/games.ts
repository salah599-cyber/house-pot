"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertGameHost } from "@/lib/auth/permissions";
import {
  getUserRoles,
  requireDbUser,
  requireRole,
} from "@/lib/auth/session";
import {
  BUY_IN_OPTIONS,
  DEFAULT_MAX_PLAYERS,
  MAX_PLAYERS_CAP,
} from "@/lib/constants";
import { db } from "@/lib/db";
import {
  gameInvites,
  gameParticipants,
  games,
  platformInvites,
} from "@/lib/db/schema";
import { describeEmailDeliveryIssue } from "@/lib/email";
import { ensureClerkInvitation } from "@/lib/clerk-invitations";
import { createInviteToken, getAppUrl, getInviteExpiryDate } from "@/lib/invites";
import { createJoinCode } from "@/lib/join-code";
import { logAudit } from "@/lib/audit";
import { rateLimitSendInvites } from "@/lib/rate-limit";
import { sendGameInviteNotifications } from "@/server/notifications";

const createGameSchema = z.object({
  title: z.string().min(3).max(80),
  currency: z.string().min(3).max(3),
  defaultBuyIn: z.coerce.number().refine((value) => BUY_IN_OPTIONS.includes(value as 20 | 50)),
  maxPlayers: z.coerce.number().int().min(8).max(MAX_PLAYERS_CAP),
  location: z.string().max(120).optional(),
  scheduledAt: z.string().min(1),
  inviteEmails: z.string().optional(),
});

export async function createGameAction(formData: FormData) {
  const user = await requireRole("host");

  const parsed = createGameSchema.safeParse({
    title: formData.get("title"),
    currency: formData.get("currency"),
    defaultBuyIn: formData.get("defaultBuyIn"),
    maxPlayers: formData.get("maxPlayers") ?? DEFAULT_MAX_PLAYERS,
    location: formData.get("location") || undefined,
    scheduledAt: formData.get("scheduledAt"),
    inviteEmails: formData.get("inviteEmails") || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid game details. Check all fields and try again." };
  }

  const data = parsed.data;
  const emails = (data.inviteEmails ?? "")
    .split(/[\n,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const [game] = await db
    .insert(games)
    .values({
      hostId: user.id,
      title: data.title,
      currency: data.currency,
      defaultBuyIn: data.defaultBuyIn.toFixed(2),
      maxPlayers: data.maxPlayers,
      location: data.location,
      joinCode: createJoinCode(),
      scheduledAt: new Date(data.scheduledAt),
      status: "open",
    })
    .returning();

  await logAudit({
    actorUserId: user.id,
    action: "game_created",
    entityType: "game",
    entityId: game.id,
    summary: `Created game "${game.title}"`,
    metadata: { joinCode: game.joinCode, maxPlayers: game.maxPlayers },
  });

  await db.insert(gameParticipants).values({
    gameId: game.id,
    userId: user.id,
    status: "host",
    seatNumber: 1,
    confirmedAt: new Date(),
  });

  if (emails.length > 0) {
    const inviteResult = await inviteEmailsToGame(
      game.id,
      emails,
      user.id,
      user.displayName,
      game.title,
    );

    revalidatePath("/host/dashboard");
    revalidatePath(`/host/games/${game.id}`);

    if ("error" in inviteResult && inviteResult.error) {
      return {
        success: true,
        gameId: game.id,
        invitesSent: 0,
        warning: `Game created, but invites failed: ${inviteResult.error}`,
      };
    }

    return {
      success: true,
      gameId: game.id,
      invitesSent: inviteResult.sent,
      warning: inviteResult.warning,
    };
  }

  revalidatePath("/host/dashboard");
  return { success: true, gameId: game.id, invitesSent: 0 };
}

export async function inviteEmailsToGame(
  gameId: string,
  emails: string[],
  invitedByUserId: string,
  hostName: string,
  gameTitle: string,
) {
  const user = await requireDbUser();
  const roles = getUserRoles(user);
  const allowed = await assertGameHost(gameId, user.id, roles);

  if (!allowed) {
    return { error: "You can only invite players to your own games." };
  }

  const limited = await rateLimitSendInvites(user.id);
  if (!limited.success) {
    return { error: limited.error };
  }

  const uniqueEmails = [...new Set(emails.map((email) => email.toLowerCase()))];
  let sent = 0;
  const warnings: string[] = [];

  for (const email of uniqueEmails) {
    if (email === user.email.toLowerCase()) continue;

    const existingUser = await db.query.users.findFirst({
      where: (fields, { eq: equals }) => equals(fields.email, email),
    });

    let platformInviteToken: string | null = null;
    let platformInviteId: string | null = null;

    if (!existingUser) {
      const token = createInviteToken();
      const [platformInvite] = await db
        .insert(platformInvites)
        .values({
          email,
          token,
          invitedByUserId,
          expiresAt: getInviteExpiryDate(),
        })
        .returning();
      platformInviteToken = token;
      platformInviteId = platformInvite.id;
    }

    const gameInviteToken = createInviteToken();
    await db.insert(gameInvites).values({
      gameId,
      email,
      userId: existingUser?.id ?? null,
      platformInviteId,
      token: gameInviteToken,
      expiresAt: getInviteExpiryDate(),
    });

    const existingParticipant = await db.query.gameParticipants.findFirst({
      where: and(
        eq(gameParticipants.gameId, gameId),
        existingUser
          ? eq(gameParticipants.userId, existingUser.id)
          : eq(gameParticipants.guestName, email),
      ),
    });

    if (!existingParticipant) {
      await db.insert(gameParticipants).values({
        gameId,
        userId: existingUser?.id ?? null,
        status: "invited",
      });
    }

    const registrationLink = platformInviteToken
      ? getAppUrl(`/invite/${platformInviteToken}?game=${gameInviteToken}`)
      : getAppUrl(`/game-invite/${gameInviteToken}`);

    const emailResult = await sendGameInviteNotifications({
      email,
      userId: existingUser?.id ?? null,
      gameTitle,
      hostName,
      registrationLink,
      gameInviteLink: getAppUrl(`/game-invite/${gameInviteToken}`),
    });

    const emailDelivered = emailResult.status === "sent";
    if (!emailDelivered && !existingUser && platformInviteToken) {
      const clerkResult = await ensureClerkInvitation({
        emailAddress: email,
        redirectUrl: registrationLink,
        notify: true,
      });
      if ("emailed" in clerkResult && clerkResult.emailed) {
        // Clerk invitation email sent for unregistered player.
      } else {
        const issue = describeEmailDeliveryIssue(emailResult);
        if (issue) {
          warnings.push(`${email}: ${issue}`);
        }
      }
    } else if (!emailDelivered) {
      const issue = describeEmailDeliveryIssue(emailResult);
      if (issue) {
        warnings.push(
          existingUser
            ? `${email}: ${issue} They can still see the invite in their player dashboard.`
            : `${email}: ${issue}`,
        );
      }
    }

    await logAudit({
      actorUserId: invitedByUserId,
      action: "invite_sent",
      entityType: "game_invite",
      entityId: gameId,
      summary: `Invited ${email} to ${gameTitle}`,
      metadata: { email, hasPlatformInvite: Boolean(platformInviteToken) },
    });
    sent += 1;
  }

  revalidatePath(`/host/games/${gameId}`);

  if (warnings.length > 0) {
    return {
      success: true,
      sent,
      warning: warnings.join(" "),
    };
  }

  return { success: true, sent };
}

export async function invitePlayersAction(gameId: string, formData: FormData) {
  const emails = String(formData.get("inviteEmails") ?? "");
  const parsedEmails = emails
    .split(/[\n,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (parsedEmails.length === 0) {
    return { error: "Add at least one email address." };
  }

  const user = await requireDbUser();
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { error: "Game not found." };
  }

  return inviteEmailsToGame(
    gameId,
    parsedEmails,
    user.id,
    user.displayName,
    game.title,
  );
}

export async function updateMaxPlayersAction(gameId: string, maxPlayers: number) {
  const user = await requireRole("host");
  const roles = getUserRoles(user);
  const allowed = await assertGameHost(gameId, user.id, roles);

  if (!allowed) {
    return { error: "Unauthorized." };
  }

  if (maxPlayers < 8 || maxPlayers > MAX_PLAYERS_CAP) {
    return { error: `Player count must be between 8 and ${MAX_PLAYERS_CAP}.` };
  }

  const [{ value: confirmedCount }] = await db
    .select({ value: count() })
    .from(gameParticipants)
    .where(
      and(
        eq(gameParticipants.gameId, gameId),
        inArray(gameParticipants.status, ["host", "confirmed", "guest"]),
      ),
    );

  if (maxPlayers < Number(confirmedCount)) {
    return {
      error: `Cannot reduce below ${confirmedCount} already confirmed players.`,
    };
  }

  await db.update(games).set({ maxPlayers }).where(eq(games.id, gameId));
  revalidatePath(`/host/games/${gameId}`);
  return { success: true };
}
