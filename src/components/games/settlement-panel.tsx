"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  markMySettlementCompleteAction,
  markSettlementSettledAction,
} from "@/server/actions/settlements";
import { formatAmount } from "@/lib/dates";
import { buildSettlementWhatsAppMessage } from "@/lib/whatsapp-messages";
import { WhatsAppShareButton } from "@/components/shared/whatsapp-share-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SettlementLine = {
  id: string;
  amount: string;
  payerMarkedSettled: boolean;
  payeeMarkedSettled: boolean;
  fromParticipant: {
    id: string;
    user?: { displayName: string } | null;
    guestName?: string | null;
  };
  toParticipant: {
    id: string;
    user?: { displayName: string } | null;
    guestName?: string | null;
  };
};

type SettlementPanelProps = {
  gameId: string;
  gameDate: Date | string;
  participantId: string;
  settlements: SettlementLine[];
  settlementMarked: boolean;
};

function displayName(participant: SettlementLine["fromParticipant"]) {
  return participant.user?.displayName ?? participant.guestName ?? "Player";
}

export function SettlementPanel({
  gameId,
  gameDate,
  participantId,
  settlements,
  settlementMarked,
}: SettlementPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const shareMessage = buildSettlementWhatsAppMessage({
    date: gameDate,
    lines: settlements.map((line) => ({
      fromName: displayName(line.fromParticipant),
      toName: displayName(line.toParticipant),
      amount: line.amount,
    })),
  });

  if (settlements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlements</CardTitle>
          <CardDescription>
            Settlement lines appear after the host finalizes the game.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My settlements</CardTitle>
        <CardDescription>
          You only see transfers that involve you. Mark each one settled once payment is done.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settlements.map((line) => {
          const isPayer = line.fromParticipant.id === participantId;
          const counterparty = isPayer ? line.toParticipant : line.fromParticipant;
          const myMarked = isPayer ? line.payerMarkedSettled : line.payeeMarkedSettled;
          const fullySettled = line.payerMarkedSettled && line.payeeMarkedSettled;

          return (
            <div key={line.id} className="rounded-lg border border-border p-4 text-sm">
              <p className="font-medium">
                {isPayer ? "You owe" : "You receive from"} {displayName(counterparty)}
              </p>
              <p className="mt-1 text-muted-foreground">
                {formatAmount(line.amount)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  variant={myMarked ? "secondary" : "default"}
                  disabled={isPending || myMarked}
                  onClick={() =>
                    startTransition(async () => {
                      await markSettlementSettledAction(line.id, gameId);
                      router.refresh();
                    })
                  }
                >
                  {myMarked ? "You marked settled" : "Mark settled"}
                </Button>
                {fullySettled ? (
                  <span className="text-emerald-400">Fully settled</span>
                ) : null}
              </div>
            </div>
          );
        })}

        <Button
          variant="outline"
          disabled={isPending || settlementMarked}
          onClick={() =>
            startTransition(async () => {
              await markMySettlementCompleteAction(gameId);
              router.refresh();
            })
          }
        >
          {settlementMarked ? "All settlements complete" : "Mark all my settlements done"}
        </Button>

        <WhatsAppShareButton message={shareMessage} variant="outline" />
      </CardContent>
    </Card>
  );
}
