"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { toggleUserDisabledAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";

export function ToggleUserButton({
  userId,
  disabled,
}: {
  userId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={disabled ? "outline" : "destructive"}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleUserDisabledAction(userId, !disabled);
          router.refresh();
        })
      }
    >
      {disabled ? "Enable" : "Disable"}
    </Button>
  );
}
