"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { cancelGameAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";

export function CancelGameButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await cancelGameAction(gameId);
          router.refresh();
        })
      }
    >
      Cancel game
    </Button>
  );
}
