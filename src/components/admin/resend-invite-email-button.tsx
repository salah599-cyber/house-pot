"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { resendPendingInviteEmailAction } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";

export function ResendInviteEmailButton({
  inviteId,
  inviteLink,
}: {
  inviteId: string;
  inviteLink: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await resendPendingInviteEmailAction(inviteId);
            if ("error" in result && result.error) {
              setMessage(result.error);
              return;
            }

            if ("warning" in result && result.warning) {
              setMessage(result.warning);
            } else if ("message" in result && result.message) {
              setMessage(result.message);
            }

            router.refresh();
          })
        }
      >
        {isPending ? "Sending..." : "Resend email"}
      </Button>
      {message ? <p className="text-xs text-amber-400">{message}</p> : null}
      <p className="sr-only">{inviteLink}</p>
    </div>
  );
}
