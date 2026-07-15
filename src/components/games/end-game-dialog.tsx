"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { endGameAndSettleAction } from "@/server/actions/session";
import { formatMoney } from "@/lib/dates";
import type { ParticipantTotals } from "@/lib/games/totals";
import { participantDisplayName } from "@/lib/games/totals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SeatedPlayer = {
  id: string;
  seatNumber: number | null;
  user?: { displayName: string } | null;
  guestName?: string | null;
};

type EndGameDialogProps = {
  gameId: string;
  currency: string;
  seatedPlayers: SeatedPlayer[];
  totalsByParticipant: Record<string, ParticipantTotals>;
};

export function EndGameDialog({
  gameId,
  currency,
  seatedPlayers,
  totalsByParticipant,
}: EndGameDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cashOuts, setCashOuts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      seatedPlayers.map((player) => [
        player.id,
        String(totalsByParticipant[player.id]?.totalCashOut ?? 0),
      ]),
    ),
  );

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="min-h-11 flex-1 sm:flex-none">
          End game & settle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>End game and generate settlements</DialogTitle>
          <DialogDescription>
            Enter each player&apos;s final cash-out. Total cash-out must equal total buy-ins
            ({formatMoney(totalIn, currency)}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {seatedPlayers.map((player) => (
            <div key={player.id} className="space-y-2">
              <Label htmlFor={`cashout-${player.id}`}>
                Seat {player.seatNumber} · {participantDisplayName(player)}
              </Label>
              <Input
                id={`cashout-${player.id}`}
                type="number"
                min="0"
                step="1"
                value={cashOuts[player.id] ?? "0"}
                onChange={(event) =>
                  setCashOuts((current) => ({
                    ...current,
                    [player.id]: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                In: {formatMoney(totalsByParticipant[player.id]?.totalIn ?? 0, currency)}
              </p>
            </div>
          ))}

          <p className={balanced ? "text-emerald-400" : "text-rose-400"}>
            Total out: {formatMoney(totalOut, currency)}{" "}
            {balanced ? "(balanced)" : `(must equal ${formatMoney(totalIn, currency)})`}
          </p>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            disabled={isPending || !balanced}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await endGameAndSettleAction(
                  gameId,
                  seatedPlayers.map((player) => ({
                    participantId: player.id,
                    amount: Number(cashOuts[player.id] ?? 0),
                  })),
                );

                if (result.error) {
                  setError(result.error);
                  return;
                }

                setOpen(false);
                router.refresh();
              })
            }
          >
            {isPending ? "Settling..." : "Confirm settlement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
