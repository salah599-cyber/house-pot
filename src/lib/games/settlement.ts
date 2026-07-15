export type SettlementEntry = {
  participantId: string;
  netResult: number;
};

export type SettlementTransfer = {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
};

export function buildSettlementTransfers(entries: SettlementEntry[]): SettlementTransfer[] {
  const losers = entries
    .filter((entry) => entry.netResult < -0.009)
    .map((entry) => ({ ...entry, netResult: Math.abs(entry.netResult) }))
    .sort((a, b) => b.netResult - a.netResult);

  const winners = entries
    .filter((entry) => entry.netResult > 0.009)
    .map((entry) => ({ ...entry }))
    .sort((a, b) => b.netResult - a.netResult);

  const transfers: SettlementTransfer[] = [];
  const loserBalances = losers.map((entry) => ({ ...entry }));
  const winnerBalances = winners.map((entry) => ({ ...entry }));

  let loserIndex = 0;
  let winnerIndex = 0;

  while (loserIndex < loserBalances.length && winnerIndex < winnerBalances.length) {
    const loser = loserBalances[loserIndex];
    const winner = winnerBalances[winnerIndex];
    const amount = Math.min(loser.netResult, winner.netResult);

    if (amount <= 0.009) {
      if (loser.netResult <= 0.009) loserIndex += 1;
      if (winner.netResult <= 0.009) winnerIndex += 1;
      continue;
    }

    transfers.push({
      fromParticipantId: loser.participantId,
      toParticipantId: winner.participantId,
      amount: roundMoney(amount),
    });

    loser.netResult = roundMoney(loser.netResult - amount);
    winner.netResult = roundMoney(winner.netResult - amount);

    if (loser.netResult <= 0.009) loserIndex += 1;
    if (winner.netResult <= 0.009) winnerIndex += 1;
  }

  return transfers;
}

export function validateSettlementBalance(entries: SettlementEntry[]) {
  const total = entries.reduce((sum, entry) => sum + entry.netResult, 0);
  return Math.abs(total) < 0.05;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
