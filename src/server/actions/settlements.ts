"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { assertGameHost } from "@/lib/auth/permissions";
import { getUserRoles, requireDbUser, requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { gameParticipants, games, settlementLines } from "@/lib/db/schema";

function revalidateSettlementPaths(gameId: string) {
  revalidatePath(`/player/games/${gameId}`);
  revalidatePath(`/host/games/${gameId}`);
  revalidatePath(`/host/games/${gameId}/live`);
}

async function markParticipantsSettledWhenComplete(
  fromParticipantId: string,
  toParticipantId: string,
) {
  await db
    .update(gameParticipants)
    .set({ settlementMarked: true })
    .where(
      or(
        eq(gameParticipants.id, fromParticipantId),
        eq(gameParticipants.id, toParticipantId),
      ),
    );
}

export async function markSettlementSettledAction(
  settlementLineId: string,
  gameId: string,
) {
  const user = await requireDbUser();

  const participant = await db.query.gameParticipants.findFirst({
    where: and(
      eq(gameParticipants.gameId, gameId),
      eq(gameParticipants.userId, user.id),
    ),
  });

  if (!participant) {
    return { error: "You are not part of this game." };
  }

  const line = await db.query.settlementLines.findFirst({
    where: eq(settlementLines.id, settlementLineId),
  });

  if (!line || line.gameId !== gameId) {
    return { error: "Settlement not found." };
  }

  const isPayer = line.fromParticipantId === participant.id;
  const isPayee = line.toParticipantId === participant.id;

  if (!isPayer && !isPayee) {
    return { error: "You can only update your own settlements." };
  }

  await db
    .update(settlementLines)
    .set(
      isPayer
        ? { payerMarkedSettled: true }
        : { payeeMarkedSettled: true },
    )
    .where(eq(settlementLines.id, settlementLineId));

  const updated = await db.query.settlementLines.findFirst({
    where: eq(settlementLines.id, settlementLineId),
  });

  if (
    updated?.payerMarkedSettled &&
    updated.payeeMarkedSettled &&
    (isPayer || isPayee)
  ) {
    await markParticipantsSettledWhenComplete(
      line.fromParticipantId,
      line.toParticipantId,
    );
  }

  revalidateSettlementPaths(gameId);
  return { success: true };
}

export async function markMySettlementCompleteAction(gameId: string) {
  const user = await requireDbUser();

  const participant = await db.query.gameParticipants.findFirst({
    where: and(
      eq(gameParticipants.gameId, gameId),
      eq(gameParticipants.userId, user.id),
    ),
  });

  if (!participant) {
    return { error: "You are not part of this game." };
  }

  await db
    .update(gameParticipants)
    .set({ settlementMarked: true })
    .where(eq(gameParticipants.id, participant.id));

  await db
    .update(settlementLines)
    .set({ payerMarkedSettled: true })
    .where(
      and(
        eq(settlementLines.gameId, gameId),
        eq(settlementLines.fromParticipantId, participant.id),
      ),
    );

  await db
    .update(settlementLines)
    .set({ payeeMarkedSettled: true })
    .where(
      and(
        eq(settlementLines.gameId, gameId),
        eq(settlementLines.toParticipantId, participant.id),
      ),
    );

  const lines = await db.query.settlementLines.findMany({
    where: eq(settlementLines.gameId, gameId),
  });

  for (const line of lines) {
    if (line.payerMarkedSettled && line.payeeMarkedSettled) {
      await markParticipantsSettledWhenComplete(
        line.fromParticipantId,
        line.toParticipantId,
      );
    }
  }

  revalidateSettlementPaths(gameId);
  return { success: true };
}

export async function markSettlementSettledByHostAction(
  settlementLineId: string,
  gameId: string,
) {
  const user = await requireRole("host");
  const roles = getUserRoles(user);
  const allowed = await assertGameHost(gameId, user.id, roles);

  if (!allowed) {
    return { error: "You are not the host of this game." };
  }

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game || game.status !== "settled") {
    return { error: "Settlements can only be updated after the game is settled." };
  }

  const line = await db.query.settlementLines.findFirst({
    where: eq(settlementLines.id, settlementLineId),
  });

  if (!line || line.gameId !== gameId) {
    return { error: "Settlement not found." };
  }

  await db
    .update(settlementLines)
    .set({
      payerMarkedSettled: true,
      payeeMarkedSettled: true,
    })
    .where(eq(settlementLines.id, settlementLineId));

  await markParticipantsSettledWhenComplete(
    line.fromParticipantId,
    line.toParticipantId,
  );

  revalidateSettlementPaths(gameId);
  return { success: true };
}
