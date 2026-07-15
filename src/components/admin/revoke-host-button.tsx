"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { revokeHostRoleAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";

export function RevokeHostButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await revokeHostRoleAction(userId);
          router.refresh();
        })
      }
    >
      Revoke host
    </Button>
  );
}
