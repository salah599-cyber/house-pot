"use server";

import { and, count, eq, gt, inArray } from "drizzle-orm";
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
  users,
} from "@/lib/db/schema";
import { describeEmailDeliveryIssue } from "@/lib/email";
import { ensureClerkInvitation } from "@/lib/clerk-invitations";
import { createInviteToken, getAppUrl, getInviteExpiryDate } from "@/lib/invites";
import { createJoinCode } from "@/lib/join-code";
import { parseGuestNames } from "@/lib/games/guests";
import { logAudit } from "@/lib/audit";
import { rateLimitSendInvites } from "@/lib/rate-limit";
import { sendGameInviteNotifications } from "@/server/notifications";
import { parseScheduledAt } from "@/lib/dates";
import { addGuestsToGame } from "@/server/actions/participants";
import {
  parseInviteWhatsappPhones,
  whatsappPhoneAtIndex,
} from "@/lib/whatsapp";

const createGameSchema = z.object({
  title: z.string().min(3).max(80),
  currency: z.string().min(3).max(3),
  defaultBuyIn: z.coerce.number().refine((value) => BUY_IN_OPTIONS.includes(value as 20 | 50)),
  maxPlayers: z.coerce.number().int().min(8).max(MAX_PLAYERS_CAP),
  location: z.string().max(120).optional(),
  scheduledAt: z.string().min(1),
  guestNames: z.string().optional(),
});

function parseInviteEmails(raw: string | undefined) {
  return [
    ...new Set(
      (raw ?? "")
        .split(/[\n,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function parseInvitePlayerIds(formData: FormData) {
  return [...new Set(formData.getAll("invitePlayerIds").map((value) => String(value).trim()).filter(Boolean))];
}

function parseInviteTargets(formData: FormData, guestNamesRaw?: string) {
  const emailsFromCheckboxes = formData
    .getAll("invitePendingEmails")
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);
  const emailsFromText = parseInviteEmails(String(formData.get("inviteEmails") ?? ""));

  return {
    playerIds: parseInvitePlayerIds(formData),
    emails: [...new Set([...emailsFromCheckboxes, ...emailsFromText])],
    guestNames: parseGuestNames(guestNamesRaw ?? String(formData.get("guestNames") ?? "")),
  };
}

export async function createGameAction(formData: FormData) {
  const user = await requireRole("host");

  const parsed = createGameSchema.safeParse({
    title: formData.get("title"),
    currency: formData.get("currency"),
    defaultBuyIn: formData.get("defaultBuyIn"),
    maxPlayers: formData.get("maxPlayers") ?? DEFAULT_MAX_PLAYERS,
    location: formData.get("location") || undefined,
    scheduledAt: formData.get("scheduledAt"),
    guestNames: formData.get("guestNames") || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid game details. Check all fields and try again." };
  }

  const data = parsed.data;
  const { playerIds, emails, guestNames } = parseInviteTargets(formData, data.guestNames);

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
      scheduledAt: parseScheduledAt(data.scheduledAt),
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

  let invitesSent = 0;
  let guestsAdded = 0;
  const warnings: string[] = [];

  if (playerIds.length > 0 || emails.length > 0) {
    const inviteResult = await invitePlayersToGame(
      game.id,
      { playerIds, emails },
      user.id,
      user.displayName,
      game.title,
    );

    if ("error" in inviteResult && inviteResult.error) {
      warnings.push(`Invites failed: ${inviteResult.error}`);
    } else {
      invitesSent = inviteResult.sent ?? 0;
      if (inviteResult.warning) {
        warnings.push(inviteResult.warning);
      }
    }
  }

  if (guestNames.length > 0) {
    const guestResult = await addGuestsToGame(game.id, guestNames);
    if (guestResult.error) {
      warnings.push(guestResult.error);
    } else {
      guestsAdded = guestResult.added;
    }
  }

  revalidatePath("/host/dashboard");
  revalidatePath(`/host/games/${game.id}`);

  if (playerIds.length > 0 || guestNames.length > 0 || emails.length > 0) {
    return {
      success: true,
      gameId: game.id,
      invitesSent,
      guestsAdded,
      warning: warnings.length > 0 ? warnings.join(" ") : undefined,
    };
  }

  return { success: true, gameId: game.id, invitesSent: 0, guestsAdded: 0 };
}

export async function invitePlayersToGame(
  gameId: string,
  targets: { playerIds: string[]; emails: string[]; whatsappPhones?: string[] },
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

  const uniquePlayerIds = [...new Set(targets.playerIds)];
  const uniqueEmails = [...new Set(targets.emails.map((email) => email.toLowerCase()))];
  const whatsappPhones = targets.whatsappPhones ?? [];
  let sent = 0;
  const warnings: string[] = [];
  const invitedEmails = new Set<string>();

  if (uniquePlayerIds.length > 0) {
    const selectedPlayers = await db.query.users.findMany({
      where: inArray(users.id, uniquePlayerIds),
    });

    for (const player of selectedPlayers) {
      if (player.id === user.id || player.disabled) {
        continue;
      }

      const warning = await processGameInvite({
        gameId,
        email: player.email.toLowerCase(),
        existingUser: player,
        invitedByUserId,
        hostName,
        gameTitle,
        currentUserEmail: user.email.toLowerCase(),
      });

      if (warning === null) {
        invitedEmails.add(player.email.toLowerCase());
        sent += 1;
      } else if (warning) {
        warnings.push(warning);
      }
    }
  }

  for (const [index, email] of uniqueEmails.entries()) {
    if (email === user.email.toLowerCase() || invitedEmails.has(email)) {
      continue;
    }

    const whatsappPhone = whatsappPhoneAtIndex(whatsappPhones, index);
    if (whatsappPhones[index] && !whatsappPhone) {
      warnings.push(`${email}: invalid WhatsApp number.`);
      continue;
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      const warning = await processGameInvite({
        gameId,
        email,
        existingUser,
        invitedByUserId,
        hostName,
        gameTitle,
        currentUserEmail: user.email.toLowerCase(),
        whatsappPhone,
      });

      if (warning === null) {
        invitedEmails.add(email);
        sent += 1;
      } else if (warning) {
        warnings.push(warning);
      }
      continue;
    }

    const warning = await processGameInvite({
      gameId,
      email,
      existingUser: null,
      invitedByUserId,
      hostName,
      gameTitle,
      currentUserEmail: user.email.toLowerCase(),
      whatsappPhone,
    });

    if (warning === null) {
      invitedEmails.add(email);
      sent += 1;
    } else if (warning) {
      warnings.push(warning);
    }
  }

  revalidatePath(`/host/games/${gameId}`);

  if (sent === 0 && warnings.length === 0) {
    return { error: "Select registered players, pending invites, or emails to invite." };
  }

  if (warnings.length > 0) {
    return {
      success: true,
      sent,
      warning: warnings.join(" "),
    };
  }

  return { success: true, sent };
}

async function processGameInvite({
  gameId,
  email,
  existingUser,
  invitedByUserId,
  hostName,
  gameTitle,
  currentUserEmail,
  whatsappPhone,
}: {
  gameId: string;
  email: string;
  existingUser: { id: string; email: string } | null;
  invitedByUserId: string;
  hostName: string;
  gameTitle: string;
  currentUserEmail: string;
  whatsappPhone?: string | null;
}) {
  if (email === currentUserEmail) {
    return "";
  }

  const pendingInvite = await db.query.gameInvites.findFirst({
    where: and(
      eq(gameInvites.gameId, gameId),
      eq(gameInvites.email, email),
      inArray(gameInvites.status, ["pending", "registered", "confirmed"]),
    ),
  });

  if (pendingInvite) {
    return `${email} already has a pending invite for this game.`;
  }

  let platformInviteToken: string | null = null;
  let platformInviteId: string | null = null;

  if (!existingUser) {
    const existingPlatformInvite = await db.query.platformInvites.findFirst({
      where: and(
        eq(platformInvites.email, email),
        eq(platformInvites.status, "pending"),
        gt(platformInvites.expiresAt, new Date()),
      ),
    });

    if (existingPlatformInvite) {
      platformInviteToken = existingPlatformInvite.token;
      platformInviteId = existingPlatformInvite.id;
    } else {
      const token = createInviteToken();
      const [platformInvite] = await db
        .insert(platformInvites)
        .values({
          email,
          token,
          invitedByUserId,
          whatsappPhone: whatsappPhone ?? null,
          expiresAt: getInviteExpiryDate(),
        })
        .returning();
      platformInviteToken = token;
      platformInviteId = platformInvite.id;
    }
  }

  const gameInviteToken = createInviteToken();
  let resolvedWhatsappPhone = whatsappPhone ?? null;
  if (!resolvedWhatsappPhone && existingUser) {
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, existingUser.id),
      columns: { whatsappPhone: true },
    });
    resolvedWhatsappPhone = userRecord?.whatsappPhone ?? null;
  }

  await db.insert(gameInvites).values({
    gameId,
    email,
    userId: existingUser?.id ?? null,
    platformInviteId,
    token: gameInviteToken,
    whatsappPhone: resolvedWhatsappPhone,
    expiresAt: getInviteExpiryDate(),
  });

  const existingParticipant = await db.query.gameParticipants.findFirst({
    where: and(
      eq(gameParticipants.gameId, gameId),
      existingUser
        ? eq(gameParticipants.userId, existingUser.id)
        : eq(gameParticipants.invitedEmail, email),
    ),
  });

  if (!existingParticipant) {
    await db.insert(gameParticipants).values({
      gameId,
      userId: existingUser?.id ?? null,
      invitedEmail: email,
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

  let emailDelivered = emailResult.status === "sent";
  if (!existingUser) {
    const clerkResult = await ensureClerkInvitation({
      emailAddress: email,
      redirectUrl: registrationLink,
      notify: true,
    });
    if ("emailed" in clerkResult && clerkResult.emailed) {
      emailDelivered = true;
    } else if (!emailDelivered) {
      const issue = describeEmailDeliveryIssue(emailResult);
      if (issue) {
        return `${email}: ${issue}`;
      }
      if ("error" in clerkResult) {
        return `${email}: Clerk could not send an invitation email. Copy the invite link and send it manually.`;
      }
    }
  }

  await logAudit({
    actorUserId: invitedByUserId,
    action: "invite_sent",
    entityType: "game_invite",
    entityId: gameId,
    summary: `Invited ${email} to ${gameTitle}`,
    metadata: {
      email,
      hasPlatformInvite: Boolean(platformInviteToken),
      registeredPlayer: Boolean(existingUser),
    },
  });

  return null;
}

/** @deprecated Use invitePlayersToGame */
export async function inviteEmailsToGame(
  gameId: string,
  emails: string[],
  invitedByUserId: string,
  hostName: string,
  gameTitle: string,
) {
  return invitePlayersToGame(
    gameId,
    { playerIds: [], emails },
    invitedByUserId,
    hostName,
    gameTitle,
  );
}

export async function invitePlayersAction(gameId: string, formData: FormData) {
  const { playerIds, emails, guestNames } = parseInviteTargets(formData);

  if (playerIds.length === 0 && guestNames.length === 0 && emails.length === 0) {
    return { error: "Select registered players, pending invites, emails, or guest names." };
  }

  const user = await requireDbUser();
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { error: "Game not found." };
  }

  let sent = 0;
  let guestsAdded = 0;
  const warnings: string[] = [];

  if (playerIds.length > 0 || emails.length > 0) {
    const inviteResult = await invitePlayersToGame(
      gameId,
      { playerIds, emails },
      user.id,
      user.displayName,
      game.title,
    );

    if ("error" in inviteResult && inviteResult.error) {
      if (guestNames.length === 0) {
        return inviteResult;
      }
      warnings.push(inviteResult.error);
    } else {
      sent = inviteResult.sent ?? 0;
      if (inviteResult.warning) {
        warnings.push(inviteResult.warning);
      }
    }
  }

  if (guestNames.length > 0) {
    const guestResult = await addGuestsToGame(gameId, guestNames);
    if (guestResult.error) {
      warnings.push(guestResult.error);
    } else {
      guestsAdded = guestResult.added;
    }
  }

  if (sent === 0 && guestsAdded === 0) {
    return {
      error: warnings.join(" ") || "Select registered players, pending invites, emails, or guest names.",
    };
  }

  if (warnings.length > 0) {
    return {
      success: true,
      sent,
      guestsAdded,
      warning: warnings.join(" "),
    };
  }

  return { success: true, sent, guestsAdded };
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
