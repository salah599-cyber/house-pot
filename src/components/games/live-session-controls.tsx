"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

import { serializeLiveSnapshot, type GameLiveSnapshot } from "@/lib/games/live-snapshot-client";
import { startGameAction } from "@/server/actions/session";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 15_000;

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

type LiveSessionPollerProps = {
  gameId: string;
  gameStatus: GameLiveSnapshot["status"];
};

export function LiveSessionPoller({ gameId, gameStatus }: LiveSessionPollerProps) {
  const router = useRouter();
  const lastSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (gameStatus !== "active") {
      return;
    }

    let cancelled = false;

    async function poll() {
      if (cancelled || document.hidden) {
        return;
      }

      try {
        const response = await fetch(`/api/games/${gameId}/live-snapshot`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const snapshot = (await response.json()) as GameLiveSnapshot;
        const serialized = serializeLiveSnapshot(snapshot);

        if (lastSnapshotRef.current === null) {
          lastSnapshotRef.current = serialized;
          return;
        }

        if (lastSnapshotRef.current !== serialized) {
          lastSnapshotRef.current = serialized;
          router.refresh();
        }
      } catch {
        // Ignore transient network errors; next poll will retry.
      }
    }

    void poll();
    const interval = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [gameId, gameStatus, router]);

  return null;
}
