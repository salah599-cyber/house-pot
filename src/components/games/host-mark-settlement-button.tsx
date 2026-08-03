"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { markSettlementSettledByHostAction } from "@/server/actions/settlements";
import { formatAmount } from "@/lib/dates";
import { getSettlementLineStatus } from "@/lib/games/settlement";
import { Button } from "@/components/ui/button";

type HostMarkSettlementButtonProps = {
  gameId: string;
  settlementLineId: string;
  fromName: string;
  toName: string;
  amount: string;
  payerMarkedSettled: boolean;
  payeeMarkedSettled: boolean;
};

export function HostMarkSettlementButton({
  gameId,
  settlementLineId,
  fromName,
  toName,
  amount,
  payerMarkedSettled,
  payeeMarkedSettled,
}: HostMarkSettlementButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const status = getSettlementLineStatus({ payerMarkedSettled, payeeMarkedSettled });
  const fullySettled = payerMarkedSettled && payeeMarkedSettled;

  return (
    <Button
      type="button"
      size="sm"
      variant={fullySettled ? "secondary" : "default"}
      disabled={isPending || fullySettled}
      onClick={() => {
        const message = `Mark this transfer as settled?\n\n${fromName} → ${toName}\n${formatAmount(amount)}`;
        if (!window.confirm(message)) {
          return;
        }

        startTransition(async () => {
          const result = await markSettlementSettledByHostAction(
            settlementLineId,
            gameId,
          );
          if ("error" in result && result.error) {
            window.alert(result.error);
            return;
          }

          router.refresh();
        });
      }}
    >
      {isPending ? "Saving..." : fullySettled ? status : "Mark settled"}
    </Button>
  );
}
