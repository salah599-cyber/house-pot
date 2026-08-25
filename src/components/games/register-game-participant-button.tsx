"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { registerInvitedPlayerAction } from "@/server/actions/participants";
import { Button } from "@/components/ui/button";

export function RegisterGameParticipantButton({
  gameId,
  participantId,
}: {
  gameId: string;
  participantId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Register this player and assign them a seat?")) {
          return;
        }

        startTransition(async () => {
          const result = await registerInvitedPlayerAction(gameId, participantId);
          if ("error" in result && result.error) {
            window.alert(result.error);
            return;
          }

          router.refresh();
        });
      }}
    >
      {isPending ? "Registering..." : "Register"}
    </Button>
  );
}
