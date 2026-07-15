"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { removeGameParticipantAction } from "@/server/actions/participants";
import { Button } from "@/components/ui/button";

export function RemoveGameParticipantButton({
  gameId,
  participantId,
  label = "Remove",
}: {
  gameId: string;
  participantId: string;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Remove this player from the game?")) {
          return;
        }

        startTransition(async () => {
          const result = await removeGameParticipantAction(gameId, participantId);
          if ("error" in result && result.error) {
            window.alert(result.error);
            return;
          }

          router.refresh();
        });
      }}
    >
      {isPending ? "Removing..." : label}
    </Button>
  );
}
