"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cashOutPlayerAction } from "@/server/actions/session";
import { formatAmount } from "@/lib/dates";
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

type CashOutPlayerDialogProps = {
  gameId: string;
  player: {
    id: string;
    seatNumber: number | null;
    user?: { displayName: string } | null;
    guestName?: string | null;
  };
  totalIn: number;
  disabled?: boolean;
};

export function CashOutPlayerDialog({
  gameId,
  player,
  totalIn,
  disabled,
}: CashOutPlayerDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsedAmount = Number(amount);
  const amountValid = amount !== "" && !Number.isNaN(parsedAmount) && parsedAmount >= 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setAmount("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full sm:h-9"
          disabled={disabled}
        >
          Cash out
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cash out player</DialogTitle>
          <DialogDescription>
            Record how many chips {participantDisplayName(player)} is leaving with. Use 0 if
            they busted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor={`early-cashout-${player.id}`}>
            Seat {player.seatNumber ?? "—"} · {participantDisplayName(player)}
          </Label>
          <Input
            id={`early-cashout-${player.id}`}
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Total in: {formatAmount(totalIn)}
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            disabled={isPending || !amountValid}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await cashOutPlayerAction(gameId, player.id, parsedAmount);

                if (result.error) {
                  setError(result.error);
                  return;
                }

                setOpen(false);
                router.refresh();
              })
            }
          >
            {isPending ? "Saving..." : "Confirm cash-out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
