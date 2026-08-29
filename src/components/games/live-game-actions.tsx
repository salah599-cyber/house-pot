"use client";

import Link from "next/link";

import { EndGameDialog } from "@/components/games/end-game-dialog";
import { UndoLastTransactionButton } from "@/components/games/undo-transaction-button";
import type { ParticipantTotals } from "@/lib/games/totals";
import { Button } from "@/components/ui/button";

type SeatedPlayer = {
  id: string;
  seatNumber: number | null;
  user?: { displayName: string } | null;
  guestName?: string | null;
};

type LiveGameActionsProps = {
  gameId: string;
  status: string;
  seatedPlayers: SeatedPlayer[];
  totalsByParticipant: Record<string, ParticipantTotals>;
  cashedOutParticipantIds: string[];
  lastTransaction: {
    id: string;
    type: "buy_in" | "rebuy" | "cash_out";
    amount: string;
    participantName: string;
  } | null;
};

export function LiveGameActions({
  gameId,
  status,
  seatedPlayers,
  totalsByParticipant,
  cashedOutParticipantIds,
  lastTransaction,
}: LiveGameActionsProps) {
  const isActive = status === "active";

  return (
    <>
      <div className="hidden flex-wrap gap-2 sm:flex">
        {isActive ? (
          <>
            <UndoLastTransactionButton
              gameId={gameId}
              lastTransaction={lastTransaction}
            />
            <EndGameDialog
              gameId={gameId}
              seatedPlayers={seatedPlayers}
              totalsByParticipant={totalsByParticipant}
              cashedOutParticipantIds={cashedOutParticipantIds}
            />
          </>
        ) : null}
        <Button asChild variant="outline">
          <Link href={`/api/host/games/${gameId}/export`}>Export CSV</Link>
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border/60 bg-background/95 p-4 backdrop-blur supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden">
        {isActive ? (
          <>
            <UndoLastTransactionButton
              gameId={gameId}
              lastTransaction={lastTransaction}
            />
            <EndGameDialog
              gameId={gameId}
              seatedPlayers={seatedPlayers}
              totalsByParticipant={totalsByParticipant}
              cashedOutParticipantIds={cashedOutParticipantIds}
            />
          </>
        ) : null}
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <Link href={`/api/host/games/${gameId}/export`}>Export</Link>
        </Button>
      </div>
    </>
  );
}
