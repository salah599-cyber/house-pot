"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertGameHost } from "@/lib/auth/permissions";
import { getUserRoles, grantPlayerRole, requireDbUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { gameInvites, gameParticipants, games } from "@/lib/db/schema";

const guestSchema = z.object({
  guestName: z.string().min(2).max(60),
});

const occupiedStatuses = ["host", "confirmed", "guest"] as const;

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

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { error: "Game not found." };
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

  if (Number(currentCount) >= game.maxPlayers) {
    return { error: "This game is already full." };
  }

  await db.insert(gameParticipants).values({
    gameId,
    guestName: parsed.data.guestName,
    status: "guest",
    seatNumber: Number(currentCount) + 1,
    confirmedAt: new Date(),
  });

  revalidatePath(`/host/games/${gameId}`);
  return { success: true };
}

export async function confirmGameSpotAction(token: string) {
  const user = await requireDbUser();
  await grantPlayerRole(user.id);

  const invite = await db.query.gameInvites.findFirst({
    where: eq(gameInvites.token, token),
    with: { game: true },
  });

  if (!invite || invite.status === "expired" || invite.status === "declined") {
    return { error: "This game invite is no longer valid." };
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "This invite was sent to a different email address." };
  }

  const game = invite.game;
  const [{ value: confirmedCount }] = await db
    .select({ value: count() })
    .from(gameParticipants)
    .where(
      and(
        eq(gameParticipants.gameId, game.id),
        inArray(gameParticipants.status, [...occupiedStatuses]),
      ),
    );

  const isFull = Number(confirmedCount) >= game.maxPlayers;

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
        seatNumber: isFull ? null : Number(confirmedCount) + 1,
        confirmedAt: isFull ? null : new Date(),
      })
      .returning();
    participant = created;
  } else {
    await db
      .update(gameParticipants)
      .set({
        status: isFull ? "waitlist" : "confirmed",
        seatNumber: isFull ? null : Number(confirmedCount) + 1,
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

export async function declineGameInviteAction(token: string) {
  const user = await requireDbUser();

  const invite = await db.query.gameInvites.findFirst({
    where: eq(gameInvites.token, token),
  });

  if (!invite || invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "Invalid invite." };
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
  return { success: true };
}
