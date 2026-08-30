"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  CashOutSettlementForm,
  isCashOutSettlementBalanced,
} from "@/components/games/cash-out-settlement-form";
import { correctSettlementAction } from "@/server/actions/session";
import type { ParticipantTotals } from "@/lib/games/totals";
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

type SeatedPlayer = {
  id: string;
  seatNumber: number | null;
  user?: { displayName: string } | null;
  guestName?: string | null;
};

type CorrectSettlementDialogProps = {
  gameId: string;
  seatedPlayers: SeatedPlayer[];
  totalsByParticipant: Record<string, ParticipantTotals>;
};

export function CorrectSettlementDialog({
  gameId,
  seatedPlayers,
  totalsByParticipant,
}: CorrectSettlementDialogProps) {
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

  function resetCashOuts() {
    setCashOuts(
      Object.fromEntries(
        seatedPlayers.map((player) => [
          player.id,
          String(totalsByParticipant[player.id]?.totalCashOut ?? 0),
        ]),
      ),
    );
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetCashOuts();
    }
    setOpen(nextOpen);
  }

  const balanced = isCashOutSettlementBalanced(
    seatedPlayers,
    totalsByParticipant,
    cashOuts,
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-11 flex-1 sm:flex-none">
          Correct cash-outs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Correct cash-outs and re-settle</DialogTitle>
          <DialogDescription>
            Update final cash-out amounts. Settlement transfers will be regenerated
            and all &quot;marked settled&quot; flags will be reset.
          </DialogDescription>
        </DialogHeader>

        <CashOutSettlementForm
          seatedPlayers={seatedPlayers}
          totalsByParticipant={totalsByParticipant}
          cashOuts={cashOuts}
          onCashOutChange={(participantId, value) =>
            setCashOuts((current) => ({
              ...current,
              [participantId]: value,
            }))
          }
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button
            disabled={isPending || !balanced}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await correctSettlementAction(
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
            {isPending ? "Updating..." : "Confirm correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
