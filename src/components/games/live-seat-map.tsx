"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  recordQuickBuyInAction,
  recordTransactionAction,
} from "@/server/actions/session";
import { CashOutPlayerDialog } from "@/components/games/cash-out-player-dialog";
import { UndoTransactionButton } from "@/components/games/undo-transaction-button";
import { REBUY_PRESET_MULTIPLIERS } from "@/lib/constants";
import { formatAmount, formatDateTime } from "@/lib/dates";
import type { ParticipantTotals } from "@/lib/games/totals";
import { participantDisplayName, participantHasCashOut } from "@/lib/games/totals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SeatedPlayer = {
  id: string;
  seatNumber: number | null;
  status: string;
  user?: { displayName: string } | null;
  guestName?: string | null;
};

type GameTransaction = {
  id: string;
  participantId: string;
  type: "buy_in" | "rebuy" | "cash_out";
  amount: string;
  createdAt: Date | string;
};

type LiveSeatMapProps = {
  gameId: string;
  defaultBuyIn: string;
  seatedPlayers: SeatedPlayer[];
  totalsByParticipant: Record<string, ParticipantTotals>;
  transactions: GameTransaction[];
};

export function LiveSeatMap({
  gameId,
  defaultBuyIn,
  seatedPlayers,
  totalsByParticipant,
  transactions,
}: LiveSeatMapProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const buyInAmount = Number(defaultBuyIn);

  const sorted = [...seatedPlayers].sort(
    (a, b) => (a.seatNumber ?? 99) - (b.seatNumber ?? 99),
  );

  function recordPreset(
    participantId: string,
    multiplier: number,
    hasBuyIn: boolean,
  ) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("participantId", participantId);
      formData.set("type", hasBuyIn ? "rebuy" : "buy_in");
      formData.set("amount", String(buyInAmount * multiplier));
      await recordTransactionAction(gameId, formData);
      router.refresh();
    });
  }

  function formatTransactionType(type: GameTransaction["type"]) {
    switch (type) {
      case "buy_in":
        return "Buy-in";
      case "rebuy":
        return "Rebuy";
      case "cash_out":
        return "Cash-out";
    }
  }

  const transactionsByParticipant = transactions.reduce<Record<string, GameTransaction[]>>(
    (groups, transaction) => {
      const existing = groups[transaction.participantId] ?? [];
      existing.push(transaction);
      groups[transaction.participantId] = existing;
      return groups;
    },
    {},
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((player) => {
        const totals = totalsByParticipant[player.id];
        const hasBuyIn = (totals?.totalBuyIn ?? 0) > 0;
        const playerTransactions = [...(transactionsByParticipant[player.id] ?? [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const hasCashedOut = participantHasCashOut(player.id, transactions);

        return (
          <Card
            key={player.id}
            className={
              hasCashedOut
                ? "border-border/80 bg-muted/20 shadow-sm"
                : "border-border/80 shadow-sm"
            }
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate">
                    Seat {player.seatNumber ?? "—"} · {participantDisplayName(player)}
                  </span>
                  {hasCashedOut ? (
                    <Badge variant="secondary" className="shrink-0">
                      Cashed out
                    </Badge>
                  ) : null}
                </span>
                <span
                  className={
                    totals && totals.netResult >= 0 ? "text-emerald-400" : "text-rose-400"
                  }
                >
                  {totals ? formatAmount(totals.netResult) : formatAmount(0)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                <div>
                  <p className="text-xs uppercase">Buy-in</p>
                  <p>{formatAmount(totals?.totalBuyIn ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase">Rebuy</p>
                  <p>{formatAmount(totals?.totalRebuy ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase">Cash-out</p>
                  <p>{formatAmount(totals?.totalCashOut ?? 0)}</p>
                </div>
              </div>

              {playerTransactions.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-border/60 p-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Recent actions
                  </p>
                  <ul className="space-y-1">
                    {playerTransactions.map((transaction) => (
                      <li
                        key={transaction.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="min-w-0 text-muted-foreground">
                          <span className="text-foreground">
                            {formatTransactionType(transaction.type)}{" "}
                            {formatAmount(transaction.amount)}
                          </span>
                          <span className="ml-1">· {formatDateTime(transaction.createdAt)}</span>
                        </span>
                        <UndoTransactionButton
                          gameId={gameId}
                          transactionId={transaction.id}
                          type={transaction.type}
                          amount={transaction.amount}
                          label="Undo"
                          className="h-8 shrink-0 px-2"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {hasCashedOut ? (
                <p className="text-xs text-muted-foreground">
                  This player has left the table. Undo their cash-out below to let them buy in
                  again.
                </p>
              ) : (
                <div className="space-y-2">
                  <Button
                    size="lg"
                    className="h-12 w-full sm:h-9"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await recordQuickBuyInAction(gameId, player.id);
                        router.refresh();
                      })
                    }
                  >
                    Buy-in / Rebuy {defaultBuyIn}
                  </Button>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {REBUY_PRESET_MULTIPLIERS.map((multiplier) => (
                      <Button
                        key={multiplier}
                        size="lg"
                        variant="outline"
                        disabled={isPending}
                        className="h-12 flex-col gap-0 px-1 text-xs sm:h-9 sm:text-sm"
                        onClick={() => recordPreset(player.id, multiplier, hasBuyIn)}
                      >
                        <span>{multiplier}×</span>
                        <span className="text-muted-foreground">
                          {formatAmount(buyInAmount * multiplier)}
                        </span>
                      </Button>
                    ))}
                  </div>
                  <CashOutPlayerDialog
                    gameId={gameId}
                    player={player}
                    totalIn={totals?.totalIn ?? 0}
                    disabled={isPending}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
