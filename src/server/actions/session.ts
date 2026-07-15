"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertGameHost } from "@/lib/auth/permissions";
import { getUserRoles, requireRole } from "@/lib/auth/session";
import {
  buildSettlementTransfers,
  validateSettlementBalance,
} from "@/lib/games/settlement";
import { calculateAllParticipantTotals } from "@/lib/games/totals";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  gameParticipants,
  games,
  settlementLines,
  transactions,
} from "@/lib/db/schema";
import { getAppUrl } from "@/lib/invites";
import {
  sendGameSettledNotification,
  sendGameStartedNotification,
} from "@/server/notifications";

const transactionSchema = z.object({
  participantId: z.string().uuid(),
  type: z.enum(["buy_in", "rebuy", "cash_out"]),
  amount: z.coerce.number().positive(),
  note: z.string().max(200).optional(),
});

const cashOutSchema = z.object({
  participantId: z.string().uuid(),
  amount: z.coerce.number().min(0),
});

const occupiedStatuses = ["host", "confirmed", "guest"] as const;

async function requireHostGame(gameId: string) {
  const user = await requireRole("host");
  const roles = getUserRoles(user);
  const allowed = await assertGameHost(gameId, user.id, roles);

  if (!allowed) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function startGameAction(gameId: string) {
  const user = await requireHostGame(gameId);

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { error: "Game not found." };
  }

  if (game.status !== "open") {
    return { error: "Only open games can be started." };
  }

  const seated = await db.query.gameParticipants.findMany({
    where: and(
      eq(gameParticipants.gameId, gameId),
      inArray(gameParticipants.status, [...occupiedStatuses]),
    ),
  });

  if (seated.length < 2) {
    return { error: "Need at least 2 seated players to start." };
  }

  await db
    .update(games)
    .set({ status: "active", startedAt: new Date() })
    .where(eq(games.id, gameId));

  await logAudit({
    actorUserId: user.id,
    action: "game_started",
    entityType: "game",
    entityId: gameId,
    summary: `Started game "${game.title}"`,
  });

  for (const participant of seated) {
    if (!participant.userId) continue;

    const player = await db.query.users.findFirst({
      where: (fields, { eq: equals }) => equals(fields.id, participant.userId!),
    });

    if (!player) continue;

    await sendGameStartedNotification({
      email: player.email,
      userId: player.id,
      gameTitle: game.title,
      link: getAppUrl(`/player/games/${gameId}`),
    });
  }

  revalidatePath(`/host/games/${gameId}`);
  revalidatePath(`/host/games/${gameId}/live`);
  return { success: true };
}

export async function recordTransactionAction(gameId: string, formData: FormData) {
  const user = await requireHostGame(gameId);

  const parsed = transactionSchema.safeParse({
    participantId: formData.get("participantId"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid transaction." };
  }

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game || game.status !== "active") {
    return { error: "Transactions can only be recorded during an active game." };
  }

  const participant = await db.query.gameParticipants.findFirst({
    where: and(
      eq(gameParticipants.id, parsed.data.participantId),
      eq(gameParticipants.gameId, gameId),
      inArray(gameParticipants.status, [...occupiedStatuses]),
    ),
  });

  if (!participant) {
    return { error: "Participant not found at the table." };
  }

  await db.insert(transactions).values({
    gameId,
    participantId: parsed.data.participantId,
    type: parsed.data.type,
    amount: parsed.data.amount.toFixed(2),
    recordedByUserId: user.id,
    note: parsed.data.note,
  });

  await logAudit({
    actorUserId: user.id,
    action: "transaction_recorded",
    entityType: "game",
    entityId: gameId,
    summary: `Recorded ${parsed.data.type} of ${parsed.data.amount}`,
    metadata: { participantId: parsed.data.participantId },
  });

  revalidatePath(`/host/games/${gameId}/live`);
  revalidatePath(`/player/games/${gameId}`);
  return { success: true };
}

export async function recordQuickBuyInAction(gameId: string, participantId: string) {
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { error: "Game not found." };
  }

  const existing = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.gameId, gameId),
      eq(transactions.participantId, participantId),
      eq(transactions.type, "buy_in"),
    ),
  });

  const formData = new FormData();
  formData.set("participantId", participantId);
  formData.set("type", existing ? "rebuy" : "buy_in");
  formData.set("amount", game.defaultBuyIn);

  return recordTransactionAction(gameId, formData);
}

export async function endGameAndSettleAction(
  gameId: string,
  cashOuts: Array<{ participantId: string; amount: number }>,
) {
  const user = await requireHostGame(gameId);

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { error: "Game not found." };
  }

  if (game.status !== "active") {
    return { error: "Only active games can be ended." };
  }

  const seated = await db.query.gameParticipants.findMany({
    where: and(
      eq(gameParticipants.gameId, gameId),
      inArray(gameParticipants.status, [...occupiedStatuses]),
    ),
  });

  const seatedIds = new Set(seated.map((participant) => participant.id));

  for (const cashOut of cashOuts) {
    const parsed = cashOutSchema.safeParse(cashOut);
    if (!parsed.success || !seatedIds.has(parsed.data.participantId)) {
      return { error: "Invalid cash-out data." };
    }
  }

  const existingTransactions = await db.query.transactions.findMany({
    where: eq(transactions.gameId, gameId),
  });

  for (const cashOut of cashOuts) {
    const hasCashOut = existingTransactions.some(
      (tx) => tx.participantId === cashOut.participantId && tx.type === "cash_out",
    );

    if (!hasCashOut) {
      await db.insert(transactions).values({
        gameId,
        participantId: cashOut.participantId,
        type: "cash_out",
        amount: cashOut.amount.toFixed(2),
        recordedByUserId: user.id,
        note: "Final cash-out",
      });
    }
  }

  const allTransactions = await db.query.transactions.findMany({
    where: eq(transactions.gameId, gameId),
  });

  const totals = calculateAllParticipantTotals(
    seated.map((participant) => participant.id),
    allTransactions,
  );

  if (!validateSettlementBalance(totals)) {
    return {
      error:
        "Buy-ins and cash-outs do not balance. Check all player amounts before settling.",
    };
  }

  const transfers = buildSettlementTransfers(
    totals.map((entry) => ({
      participantId: entry.participantId,
      netResult: entry.netResult,
    })),
  );

  await db.delete(settlementLines).where(eq(settlementLines.gameId, gameId));

  if (transfers.length > 0) {
    await db.insert(settlementLines).values(
      transfers.map((transfer) => ({
        gameId,
        fromParticipantId: transfer.fromParticipantId,
        toParticipantId: transfer.toParticipantId,
        amount: transfer.amount.toFixed(2),
      })),
    );
  }

  await db
    .update(games)
    .set({ status: "settled", endedAt: new Date() })
    .where(eq(games.id, gameId));

  await logAudit({
    actorUserId: user.id,
    action: "game_settled",
    entityType: "game",
    entityId: gameId,
    summary: `Settled game "${game.title}"`,
    metadata: { transferCount: transfers.length },
  });

  for (const participant of seated) {
    if (!participant.userId) continue;

    const player = await db.query.users.findFirst({
      where: (fields, { eq: equals }) => equals(fields.id, participant.userId!),
    });

    if (!player) continue;

    await sendGameSettledNotification({
      email: player.email,
      userId: player.id,
      gameTitle: game.title,
      link: getAppUrl(`/player/games/${gameId}`),
    });
  }

  revalidatePath(`/host/games/${gameId}`);
  revalidatePath(`/host/games/${gameId}/live`);
  revalidatePath(`/player/games/${gameId}`);

  return { success: true };
}
