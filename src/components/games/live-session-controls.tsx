"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { startGameAction } from "@/server/actions/session";
import { Button } from "@/components/ui/button";

export function StartGameButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await startGameAction(gameId);
          router.refresh();
        })
      }
    >
      {isPending ? "Starting..." : "Start live session"}
    </Button>
  );
}

export function LiveSessionPoller() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 8000);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
