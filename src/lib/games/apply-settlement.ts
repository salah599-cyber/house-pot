import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { gameParticipants, settlementLines, transactions } from "@/lib/db/schema";

import {
  buildSettlementTransfers,
  validateSettlementBalance,
} from "./settlement";
import { calculateAllParticipantTotals } from "./totals";

export type CashOutInput = {
  participantId: string;
  amount: number;
};

type ExistingTransaction = {
  id: string;
  participantId: string;
  type: string;
  amount: string;
};

export async function syncCashOutTransactions(
  gameId: string,
  recordedByUserId: string,
  cashOuts: CashOutInput[],
  existingTransactions: ExistingTransaction[],
  options: { allowUpdates: boolean },
): Promise<{ error?: string }> {
  for (const cashOut of cashOuts) {
    const existingCashOut = existingTransactions.find(
      (tx) => tx.participantId === cashOut.participantId && tx.type === "cash_out",
    );

    if (existingCashOut) {
      const amountChanged =
        Math.abs(Number(existingCashOut.amount) - cashOut.amount) >= 0.05;

      if (amountChanged && !options.allowUpdates) {
        return {
          error:
            "Early cash-out amounts cannot be changed at settlement. Undo the cash-out on the live seat map if you need to correct it.",
        };
      }

      if (amountChanged) {
        await db
          .update(transactions)
          .set({ amount: cashOut.amount.toFixed(2) })
          .where(eq(transactions.id, existingCashOut.id));
      }
    } else {
      await db.insert(transactions).values({
        gameId,
        participantId: cashOut.participantId,
        type: "cash_out",
        amount: cashOut.amount.toFixed(2),
        recordedByUserId,
        note: "Final cash-out",
      });
    }
  }

  return {};
}

export async function regenerateSettlementLines(
  gameId: string,
  seatedParticipantIds: string[],
): Promise<{ success: true; transferCount: number } | { error: string }> {
  const allTransactions = await db.query.transactions.findMany({
    where: eq(transactions.gameId, gameId),
  });

  const totals = calculateAllParticipantTotals(
    seatedParticipantIds,
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
    .update(gameParticipants)
    .set({ settlementMarked: false })
    .where(eq(gameParticipants.gameId, gameId));

  return { success: true, transferCount: transfers.length };
}
