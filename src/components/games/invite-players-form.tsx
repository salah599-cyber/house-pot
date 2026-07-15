"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { invitePlayersAction } from "@/server/actions/games";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function InvitePlayersForm({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      action={(formData) =>
        startTransition(async () => {
          await invitePlayersAction(gameId, formData);
          router.refresh();
        })
      }
    >
      <Textarea
        name="inviteEmails"
        placeholder="Add emails separated by commas or new lines"
        rows={3}
      />
      <Button type="submit" size="sm" disabled={isPending}>
        Send invites
      </Button>
    </form>
  );
}
