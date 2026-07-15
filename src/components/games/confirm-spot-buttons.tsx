"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  confirmGameSpotAction,
  declineGameInviteAction,
} from "@/server/actions/participants";
import { Button } from "@/components/ui/button";

export function ConfirmSpotButtons({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await confirmGameSpotAction(token);
            if (result.success && result.gameId) {
              router.push(`/player/games/${result.gameId}`);
              router.refresh();
            }
          })
        }
      >
        Confirm my seat
      </Button>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await declineGameInviteAction(token);
            router.push("/player/dashboard");
            router.refresh();
          })
        }
      >
        Decline
      </Button>
    </div>
  );
}
