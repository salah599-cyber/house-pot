"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { markAllNotificationsReadAction } from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsReadAction();
          router.refresh();
        })
      }
    >
      Mark all read
    </Button>
  );
}
