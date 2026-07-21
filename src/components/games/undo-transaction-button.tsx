"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Undo2Icon } from "lucide-react";

import {
  undoLastTransactionAction,
  undoTransactionAction,
} from "@/server/actions/session";
import { formatMoney } from "@/lib/dates";
import { Button } from "@/components/ui/button";

type TransactionType = "buy_in" | "rebuy" | "cash_out";

function formatTransactionType(type: TransactionType) {
  switch (type) {
    case "buy_in":
      return "buy-in";
    case "rebuy":
      return "rebuy";
    case "cash_out":
      return "cash-out";
  }
}

type UndoTransactionButtonProps = {
  gameId: string;
  transactionId: string;
  type: TransactionType;
  amount: string;
  currency: string;
  label?: string;
  variant?: "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
};

export function UndoTransactionButton({
  gameId,
  transactionId,
  type,
  amount,
  currency,
  label = "Undo",
  variant = "ghost",
  size = "sm",
  className,
}: UndoTransactionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={isPending}
      onClick={() => {
        const message = `Undo this ${formatTransactionType(type)} of ${formatMoney(amount, currency)}?`;
        if (!window.confirm(message)) {
          return;
        }

        startTransition(async () => {
          const result = await undoTransactionAction(gameId, transactionId);
          if ("error" in result && result.error) {
            window.alert(result.error);
            return;
          }

          router.refresh();
        });
      }}
    >
      {isPending ? "Undoing..." : label}
    </Button>
  );
}

type UndoLastTransactionButtonProps = {
  gameId: string;
  currency: string;
  lastTransaction: {
    id: string;
    type: TransactionType;
    amount: string;
    participantName: string;
  } | null;
};

export function UndoLastTransactionButton({
  gameId,
  currency,
  lastTransaction,
}: UndoLastTransactionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!lastTransaction) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11"
      disabled={isPending}
      onClick={() => {
        const message = `Undo the last action (${lastTransaction.participantName}: ${formatTransactionType(lastTransaction.type)} ${formatMoney(lastTransaction.amount, currency)})?`;
        if (!window.confirm(message)) {
          return;
        }

        startTransition(async () => {
          const result = await undoLastTransactionAction(gameId);
          if ("error" in result && result.error) {
            window.alert(result.error);
            return;
          }

          router.refresh();
        });
      }}
    >
      <Undo2Icon className="size-4" />
      {isPending ? "Undoing..." : "Undo last"}
    </Button>
  );
}
