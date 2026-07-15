"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { revokeGameInviteAction } from "@/server/actions/participants";
import { Button } from "@/components/ui/button";

export function RemoveGameInviteButton({
  gameId,
  inviteId,
}: {
  gameId: string;
  inviteId: string;
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
        if (!window.confirm("Remove this game invite?")) {
          return;
        }

        startTransition(async () => {
          const result = await revokeGameInviteAction(gameId, inviteId);
          if ("error" in result && result.error) {
            window.alert(result.error);
            return;
          }

          router.refresh();
        });
      }}
    >
      {isPending ? "Removing..." : "Remove"}
    </Button>
  );
}
