"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormFeedback } from "@/components/admin/form-feedback";
import { invitePlayersAction } from "@/server/actions/games";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type FeedbackState = {
  type: "success" | "warning" | "error";
  message: string;
} | null;

export function InvitePlayersForm({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  return (
    <form
      className="space-y-3"
      action={(formData) =>
        startTransition(async () => {
          setFeedback(null);
          const result = await invitePlayersAction(gameId, formData);

          if ("error" in result && result.error) {
            setFeedback({ type: "error", message: result.error });
            return;
          }

          if ("warning" in result && result.warning) {
            setFeedback({
              type: "warning",
              message: `Sent ${result.sent} invite(s). ${result.warning}`,
            });
          } else {
            setFeedback({
              type: "success",
              message:
                "sent" in result && result.sent === 1
                  ? "Game invite sent. The player will see it on their dashboard."
                  : `Sent ${"sent" in result ? result.sent : 0} game invite(s).`,
            });
          }

          router.refresh();
        })
      }
    >
      {feedback ? <FormFeedback type={feedback.type} message={feedback.message} /> : null}
      <Textarea
        name="inviteEmails"
        placeholder="Add emails separated by commas or new lines"
        rows={3}
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Sending..." : "Send invites"}
      </Button>
    </form>
  );
}
