"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { invitePlayersToPlatformAction } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function InvitePlayersToPlatformForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      action={(formData) =>
        startTransition(async () => {
          await invitePlayersToPlatformAction(formData);
          router.refresh();
        })
      }
    >
      <Textarea
        name="inviteEmails"
        placeholder="Add emails separated by commas or new lines"
        rows={4}
      />
      <Button type="submit" disabled={isPending}>
        Send platform invites
      </Button>
    </form>
  );
}
