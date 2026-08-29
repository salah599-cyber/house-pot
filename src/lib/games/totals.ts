import type { transactions } from "@/lib/db/schema";

type Transaction = Pick<typeof transactions.$inferSelect, "participantId" | "type" | "amount">;

export type ParticipantTotals = {
  participantId: string;
  totalBuyIn: number;
  totalRebuy: number;
  totalCashOut: number;
  totalIn: number;
  netResult: number;
};

export function calculateParticipantTotals(
  participantId: string,
  gameTransactions: Transaction[],
): ParticipantTotals {
  const mine = gameTransactions.filter((tx) => tx.participantId === participantId);

  const totalBuyIn = sumByType(mine, "buy_in");
  const totalRebuy = sumByType(mine, "rebuy");
  const totalCashOut = sumByType(mine, "cash_out");
  const totalIn = totalBuyIn + totalRebuy;

  return {
    participantId,
    totalBuyIn,
    totalRebuy,
    totalCashOut,
    totalIn,
    netResult: totalCashOut - totalIn,
  };
}

export function calculateAllParticipantTotals(
  participantIds: string[],
  gameTransactions: Transaction[],
): ParticipantTotals[] {
  return participantIds.map((id) => calculateParticipantTotals(id, gameTransactions));
}

export function participantHasCashOut(
  participantId: string,
  gameTransactions: Transaction[],
) {
  return gameTransactions.some(
    (tx) => tx.participantId === participantId && tx.type === "cash_out",
  );
}

function sumByType(transactions: Transaction[], type: Transaction["type"]) {
  return transactions
    .filter((tx) => tx.type === type)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
}

export function participantDisplayName(participant: {
  user?: { displayName: string } | null;
  guestName?: string | null;
}) {
  return participant.user?.displayName ?? participant.guestName ?? "Player";
}
