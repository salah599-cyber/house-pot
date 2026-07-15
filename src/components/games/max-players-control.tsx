"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updateMaxPlayersAction } from "@/server/actions/games";
import { Button } from "@/components/ui/button";

export function MaxPlayersControl({
  gameId,
  maxPlayers,
}: {
  gameId: string;
  maxPlayers: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      {[8, 9].map((value) => (
        <Button
          key={value}
          size="sm"
          variant={maxPlayers === value ? "default" : "outline"}
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await updateMaxPlayersAction(gameId, value);
              router.refresh();
            })
          }
        >
          {value} players
        </Button>
      ))}
    </div>
  );
}
