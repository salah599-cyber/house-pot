"use server";

import { and, count, eq, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertGameHost } from "@/lib/auth/permissions";
import { getUserRoles, grantPlayerRole, requireDbUser } from "@/lib/auth/session";
import { isGameInviteActive, isGameInviteExpired } from "@/lib/game-invites";
import { getAppUrl } from "@/lib/invites";
import { db } from "@/lib/db";
import { gameInvites, gameParticipants, games, transactions } from "@/lib/db/schema";
import { validateGuestName } from "@/lib/games/guests";
import { sendGameConfirmedNotification } from "@/server/notifications";

const guestSchema = z.object({
  guestName: z.string().min(2).max(60),
});

const occupiedStatuses = ["host", "confirmed", "guest"] as const;

async function countOccupiedSeats(gameId: string) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(gameParticipants)
    .where(
      and(
        eq(gameParticipants.gameId, gameId),
        inArray(gameParticipants.status, [...occupiedStatuses]),
      ),
    );

  return Number(value);
}

async function markGameInviteConfirmed(input: {
  gameId: string;
  userId: string | null;
  invitedEmail: string | null;
  status: "confirmed" | "registered";
}) {
  const email = input.invitedEmail?.toLowerCase() ?? null;

  if (!input.userId && !email) {
    return;
  }

  const identityFilter =
    input.userId && email
      ? or(eq(gameInvites.userId, input.userId), eq(gameInvites.email, email))
      : input.userId
        ? eq(gameInvites.userId, input.userId)
        : eq(gameInvites.email, email ?? "");

  await db
    .update(gameInvites)
    .set({
      status: input.status,
      ...(input.userId ? { userId: input.userId } : {}),
    })
    .where(
      and(
        eq(gameInvites.gameId, input.gameId),
        inArray(gameInvites.status, ["pending", "registered"]),
        identityFilter,
      ),
    );
}

export async function addGuestsToGame(gameId: string, names: string[]) {
  if (names.length === 0) {
    return { added: 0 };
  }

  for (const name of names) {
    const error = validateGuestName(name);
    if (error) {
      return { added: 0, error };
    }
  }

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { added: 0, error: "Game not found." };
  }

  const [{ value: currentCount }] = await db
    .select({ value: count() })
    .from(gameParticipants)
    .where(
      and(
        eq(gameParticipants.gameId, gameId),
        inArray(gameParticipants.status, [...occupiedStatuses]),
      ),
    );

  const available = game.maxPlayers - Number(currentCount);
  if (names.length > available) {
    return {
      added: 0,
      error:
        available === 0
          ? "This game is already full."
          : `Can only add ${available} more guest(s); this game allows ${game.maxPlayers} players including the host.`,
    };
  }

  const now = new Date();
  await db.insert(gameParticipants).values(
    names.map((guestName, index) => ({
      gameId,
      guestName,
      status: "guest" as const,
      seatNumber: Number(currentCount) + index + 1,
      confirmedAt: now,
    })),
  );

  revalidatePath(`/host/games/${gameId}`);
  return { added: names.length };
}

export async function addGuestPlayerAction(gameId: string, formData: FormData) {
  const user = await requireDbUser();
  const roles = getUserRoles(user);
  const allowed = await assertGameHost(gameId, user.id, roles);

  if (!allowed) {
    return { error: "Unauthorized." };
  }

  const parsed = guestSchema.safeParse({
    guestName: formData.get("guestName"),
  });

  if (!parsed.success) {
    return { error: "Guest name must be at least 2 characters." };
  }

  const result = await addGuestsToGame(gameId, [parsed.data.guestName]);
  if (result.error) {
    return { error: result.error };
  }

  return { success: true };
}

export async function confirmGameSpotAction(token: string) {
  const user = await requireDbUser();
  await grantPlayerRole(user.id);

  const invite = await db.query.gameInvites.findFirst({
    where: eq(gameInvites.token, token),
    with: { game: true },
  });

  if (!invite || !isGameInviteActive(invite)) {
    if (invite && isGameInviteExpired(invite) && invite.status !== "expired") {
      await db
        .update(gameInvites)
        .set({ status: "expired" })
        .where(eq(gameInvites.id, invite.id));
    }
    return { error: "This game invite is no longer valid." };
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "This invite was sent to a different email address." };
  }

  const game = invite.game;
  const confirmedCount = await countOccupiedSeats(game.id);
  const isFull = confirmedCount >= game.maxPlayers;

  let participant = await db.query.gameParticipants.findFirst({
    where: and(
      eq(gameParticipants.gameId, game.id),
      eq(gameParticipants.userId, user.id),
    ),
  });

  if (!participant) {
    const [created] = await db
      .insert(gameParticipants)
      .values({
        gameId: game.id,
        userId: user.id,
        status: isFull ? "waitlist" : "confirmed",
        seatNumber: isFull ? null : confirmedCount + 1,
        confirmedAt: isFull ? null : new Date(),
      })
      .returning();
    participant = created;
  } else {
    await db
      .update(gameParticipants)
      .set({
        status: isFull ? "waitlist" : "confirmed",
        seatNumber: isFull ? null : confirmedCount + 1,
        confirmedAt: isFull ? null : new Date(),
      })
      .where(eq(gameParticipants.id, participant.id));
  }

  await db
    .update(gameInvites)
    .set({ status: isFull ? "registered" : "confirmed", userId: user.id })
    .where(eq(gameInvites.id, invite.id));

  revalidatePath("/player/dashboard");
  revalidatePath(`/player/games/${game.id}`);
  revalidatePath(`/host/games/${game.id}`);

  return {
    success: true,
    waitlisted: isFull,
    gameId: game.id,
  };
}

export async function registerInvitedPlayerAction(gameId: string, participantId: string) {
  const user = await requireDbUser();
  const roles = getUserRoles(user);
  const allowed = await assertGameHost(gameId, user.id, roles);

  if (!allowed) {
    return { error: "Unauthorized." };
  }

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { error: "Game not found." };
  }

  if (game.status !== "open") {
    return { error: "Players can only be registered before the game starts." };
  }

  const participant = await db.query.gameParticipants.findFirst({
    where: and(eq(gameParticipants.id, participantId), eq(gameParticipants.gameId, gameId)),
    with: { user: true },
  });

  if (!participant) {
    return { error: "Player not found on this game." };
  }

  if (participant.status !== "invited") {
    return { error: "Only invited players can be registered onto the table." };
  }

  const occupiedCount = await countOccupiedSeats(gameId);
  if (occupiedCount >= game.maxPlayers) {
    return {
      error: "This game is full. Increase capacity or remove a seated player first.",
    };
  }

  if (participant.userId) {
    await grantPlayerRole(participant.userId);
  }

  await db
    .update(gameParticipants)
    .set({
      status: "confirmed",
      seatNumber: occupiedCount + 1,
      confirmedAt: new Date(),
    })
    .where(eq(gameParticipants.id, participant.id));

  await markGameInviteConfirmed({
    gameId,
    userId: participant.userId,
    invitedEmail: participant.invitedEmail ?? participant.user?.email ?? null,
    status: "confirmed",
  });

  const notifyEmail = participant.user?.email ?? participant.invitedEmail;
  if (notifyEmail) {
    await sendGameConfirmedNotification({
      email: notifyEmail,
      userId: participant.userId,
      gameTitle: game.title,
      link: participant.userId
        ? getAppUrl(`/player/games/${gameId}`)
        : getAppUrl("/player/dashboard"),
    });
  }

  revalidatePath(`/host/games/${gameId}`);
  revalidatePath("/player/dashboard");
  revalidatePath(`/player/games/${gameId}`);

  return { success: true, seatNumber: occupiedCount + 1 };
}

export async function declineGameInviteAction(token: string) {
  const user = await requireDbUser();

  const invite = await db.query.gameInvites.findFirst({
    where: eq(gameInvites.token, token),
  });

  if (!invite || invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "Invalid invite." };
  }

  if (!isGameInviteActive(invite)) {
    return { error: "This game invite is no longer valid." };
  }

  await db
    .update(gameInvites)
    .set({ status: "declined" })
    .where(eq(gameInvites.id, invite.id));

  await db
    .update(gameParticipants)
    .set({ status: "declined" })
    .where(
      and(
        eq(gameParticipants.gameId, invite.gameId),
        eq(gameParticipants.userId, user.id),
      ),
    );

  revalidatePath("/player/dashboard");
  revalidatePath(`/host/games/${invite.gameId}`);
  return { success: true };
}

const removableParticipantStatuses = ["invited", "declined", "waitlist", "guest"] as const;

export async function removeGameParticipantAction(gameId: string, participantId: string) {
  const user = await requireDbUser();
  const roles = getUserRoles(user);
  const allowed = await assertGameHost(gameId, user.id, roles);

  if (!allowed) {
    return { error: "Unauthorized." };
  }

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { error: "Game not found." };
  }

  if (game.status !== "open") {
    return { error: "Players can only be removed before the game starts." };
  }

  const participant = await db.query.gameParticipants.findFirst({
    where: and(eq(gameParticipants.id, participantId), eq(gameParticipants.gameId, gameId)),
    with: { user: true },
  });

  if (!participant) {
    return { error: "Player not found on this game." };
  }

  if (participant.status === "host") {
    return { error: "The host cannot be removed." };
  }

  if (!(removableParticipantStatuses as readonly string[]).includes(participant.status)) {
    return { error: "Confirmed players cannot be removed from the table." };
  }

  const hasTransactions = await db.query.transactions.findFirst({
    where: eq(transactions.participantId, participant.id),
  });

  if (hasTransactions) {
    return { error: "This player has buy-ins recorded and cannot be removed." };
  }

  const inviteEmail =
    participant.invitedEmail?.toLowerCase() ??
    participant.user?.email.toLowerCase() ??
    null;

  await db.delete(gameParticipants).where(eq(gameParticipants.id, participant.id));

  if (inviteEmail || participant.userId) {
    await db
      .update(gameInvites)
      .set({ status: "declined" })
      .where(
        and(
          eq(gameInvites.gameId, gameId),
          inArray(gameInvites.status, ["pending", "registered", "confirmed"]),
          participant.userId
            ? eq(gameInvites.userId, participant.userId)
            : eq(gameInvites.email, inviteEmail ?? ""),
        ),
      );
  }

  revalidatePath(`/host/games/${gameId}`);
  return { success: true };
}

export async function revokeGameInviteAction(gameId: string, inviteId: string) {
  const user = await requireDbUser();
  const roles = getUserRoles(user);
  const allowed = await assertGameHost(gameId, user.id, roles);

  if (!allowed) {
    return { error: "Unauthorized." };
  }

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { error: "Game not found." };
  }

  if (game.status !== "open") {
    return { error: "Invites can only be removed before the game starts." };
  }

  const invite = await db.query.gameInvites.findFirst({
    where: and(eq(gameInvites.id, inviteId), eq(gameInvites.gameId, gameId)),
  });

  if (!invite || !isGameInviteActive(invite)) {
    return { error: "Invite not found or already closed." };
  }

  await db.update(gameInvites).set({ status: "declined" }).where(eq(gameInvites.id, invite.id));

  await db
    .delete(gameParticipants)
    .where(
      and(
        eq(gameParticipants.gameId, gameId),
        invite.userId
          ? eq(gameParticipants.userId, invite.userId)
          : eq(gameParticipants.invitedEmail, invite.email),
        inArray(gameParticipants.status, [...removableParticipantStatuses]),
      ),
    );

  revalidatePath(`/host/games/${gameId}`);
  revalidatePath("/player/dashboard");
  return { success: true };
}
