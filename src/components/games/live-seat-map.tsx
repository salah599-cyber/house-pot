"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  recordQuickBuyInAction,
  recordTransactionAction,
} from "@/server/actions/session";
import { formatMoney } from "@/lib/dates";
import type { ParticipantTotals } from "@/lib/games/totals";
import { participantDisplayName } from "@/lib/games/totals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SeatedPlayer = {
  id: string;
  seatNumber: number | null;
  status: string;
  user?: { displayName: string } | null;
  guestName?: string | null;
};

type LiveSeatMapProps = {
  gameId: string;
  currency: string;
  defaultBuyIn: string;
  seatedPlayers: SeatedPlayer[];
  totalsByParticipant: Record<string, ParticipantTotals>;
};

export function LiveSeatMap({
  gameId,
  currency,
  defaultBuyIn,
  seatedPlayers,
  totalsByParticipant,
}: LiveSeatMapProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const sorted = [...seatedPlayers].sort(
    (a, b) => (a.seatNumber ?? 99) - (b.seatNumber ?? 99),
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((player) => {
        const totals = totalsByParticipant[player.id];
        const rebuyId = `rebuy-${player.id}`;

        return (
          <Card key={player.id} className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="min-w-0 truncate">
                  Seat {player.seatNumber ?? "—"} · {participantDisplayName(player)}
                </span>
                <span
                  className={
                    totals && totals.netResult >= 0 ? "text-emerald-400" : "text-rose-400"
                  }
                >
                  {totals ? formatMoney(totals.netResult, currency) : formatMoney(0, currency)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                <div>
                  <p className="text-xs uppercase">Buy-in</p>
                  <p>{formatMoney(totals?.totalBuyIn ?? 0, currency)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase">Rebuy</p>
                  <p>{formatMoney(totals?.totalRebuy ?? 0, currency)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase">Cash-out</p>
                  <p>{formatMoney(totals?.totalCashOut ?? 0, currency)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  size="lg"
                  className="h-12 flex-1 sm:h-9 sm:flex-none"
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
                <form
                  className="flex flex-1 flex-col gap-2 sm:flex-row"
                  action={(formData) =>
                    startTransition(async () => {
                      formData.set("participantId", player.id);
                      formData.set("type", "rebuy");
                      await recordTransactionAction(gameId, formData);
                      router.refresh();
                    })
                  }
                >
                  <Input
                    id={rebuyId}
                    name="amount"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={defaultBuyIn}
                    className="h-12 sm:h-9"
                  />
                  <Button
                    size="lg"
                    type="submit"
                    variant="outline"
                    disabled={isPending}
                    className="h-12 sm:h-9"
                  >
                    Rebuy
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
