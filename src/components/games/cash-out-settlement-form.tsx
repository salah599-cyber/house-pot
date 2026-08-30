"use client";

import { formatAmount } from "@/lib/dates";
import type { ParticipantTotals } from "@/lib/games/totals";
import { participantDisplayName } from "@/lib/games/totals";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SeatedPlayer = {
  id: string;
  seatNumber: number | null;
  user?: { displayName: string } | null;
  guestName?: string | null;
};

type CashOutSettlementFormProps = {
  seatedPlayers: SeatedPlayer[];
  totalsByParticipant: Record<string, ParticipantTotals>;
  cashOuts: Record<string, string>;
  onCashOutChange: (participantId: string, value: string) => void;
  cashedOutParticipantIds?: string[];
  lockEarlyCashOuts?: boolean;
};

export function CashOutSettlementForm({
  seatedPlayers,
  totalsByParticipant,
  cashOuts,
  onCashOutChange,
  cashedOutParticipantIds = [],
  lockEarlyCashOuts = false,
}: CashOutSettlementFormProps) {
  const cashedOutIds = new Set(cashedOutParticipantIds);

  const totalIn = seatedPlayers.reduce((sum, player) => {
    const totals = totalsByParticipant[player.id];
    return sum + (totals?.totalIn ?? 0);
  }, 0);

  const totalOut = seatedPlayers.reduce(
    (sum, player) => sum + Number(cashOuts[player.id] ?? 0),
    0,
  );

  const balanced = Math.abs(totalIn - totalOut) < 0.05;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Total cash-out must equal total buy-ins ({formatAmount(totalIn)}).
      </p>

      {seatedPlayers.map((player) => {
        const isEarlyCashOut = lockEarlyCashOuts && cashedOutIds.has(player.id);

        return (
          <div key={player.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={`cashout-${player.id}`}>
                Seat {player.seatNumber} · {participantDisplayName(player)}
              </Label>
              {isEarlyCashOut ? (
                <Badge variant="secondary">Cashed out early</Badge>
              ) : null}
            </div>
            <Input
              id={`cashout-${player.id}`}
              type="number"
              min="0"
              step="1"
              value={cashOuts[player.id] ?? "0"}
              disabled={isEarlyCashOut}
              onChange={(event) => onCashOutChange(player.id, event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              In: {formatAmount(totalsByParticipant[player.id]?.totalIn ?? 0)}
              {isEarlyCashOut
                ? " · Recorded when they left — undo on the seat map to change"
                : null}
            </p>
          </div>
        );
      })}

      <p className={balanced ? "text-emerald-400" : "text-rose-400"}>
        Total out: {formatAmount(totalOut)}{" "}
        {balanced ? "(balanced)" : `(must equal ${formatAmount(totalIn)})`}
      </p>
    </div>
  );
}

export function isCashOutSettlementBalanced(
  seatedPlayers: SeatedPlayer[],
  totalsByParticipant: Record<string, ParticipantTotals>,
  cashOuts: Record<string, string>,
) {
  const totalIn = seatedPlayers.reduce((sum, player) => {
    const totals = totalsByParticipant[player.id];
    return sum + (totals?.totalIn ?? 0);
  }, 0);

  const totalOut = seatedPlayers.reduce(
    (sum, player) => sum + Number(cashOuts[player.id] ?? 0),
    0,
  );

  return Math.abs(totalIn - totalOut) < 0.05;
}
