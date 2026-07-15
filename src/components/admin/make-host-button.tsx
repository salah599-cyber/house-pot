"use client";

import { useTransition } from "react";

import { promoteUserToHostAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";

export function MakeHostButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await promoteUserToHostAction(userId);
        })
      }
    >
      Make host
    </Button>
  );
}
