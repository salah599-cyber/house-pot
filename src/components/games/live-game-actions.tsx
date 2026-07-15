"use client";

import Link from "next/link";

import { EndGameDialog } from "@/components/games/end-game-dialog";
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
  currency: string;
  status: string;
  seatedPlayers: SeatedPlayer[];
  totalsByParticipant: Record<string, ParticipantTotals>;
};

export function LiveGameActions({
  gameId,
  currency,
  status,
  seatedPlayers,
  totalsByParticipant,
}: LiveGameActionsProps) {
  const isActive = status === "active";

  return (
    <>
      <div className="hidden flex-wrap gap-2 sm:flex">
        {isActive ? (
          <EndGameDialog
            gameId={gameId}
            currency={currency}
            seatedPlayers={seatedPlayers}
            totalsByParticipant={totalsByParticipant}
          />
        ) : null}
        <Button asChild variant="outline">
          <Link href={`/api/host/games/${gameId}/export`}>Export CSV</Link>
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border/60 bg-background/95 p-4 backdrop-blur supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden">
        {isActive ? (
          <EndGameDialog
            gameId={gameId}
            currency={currency}
            seatedPlayers={seatedPlayers}
            totalsByParticipant={totalsByParticipant}
          />
        ) : null}
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <Link href={`/api/host/games/${gameId}/export`}>Export</Link>
        </Button>
      </div>
    </>
  );
}
