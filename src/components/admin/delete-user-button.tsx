"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteUserAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";

export function DeleteUserButton({
  userId,
  displayName,
  email,
}: {
  userId: string;
  displayName: string;
  email: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="destructive"
      disabled={isPending}
      onClick={() => {
        const confirmed = window.confirm(
          `Permanently delete ${displayName} (${email})? This removes their account, hosted games, and related data. This cannot be undone.`,
        );

        if (!confirmed) {
          return;
        }

        startTransition(async () => {
          const result = await deleteUserAction(userId);
          if ("error" in result && result.error) {
            window.alert(result.error);
            return;
          }

          router.refresh();
        });
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
