"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { revokePlatformInviteAction } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";

export function DeletePlatformInviteButton({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Remove this invite from the list?")) {
          return;
        }

        startTransition(async () => {
          const result = await revokePlatformInviteAction(inviteId);
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
