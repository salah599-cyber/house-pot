"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormFeedback } from "@/components/admin/form-feedback";
import { InvitePlayersFields } from "@/components/games/invite-players-fields";
import { invitePlayersAction } from "@/server/actions/games";
import type { InvitableRegisteredPlayer } from "@/lib/queries/players";
import { Button } from "@/components/ui/button";

type FeedbackState = {
  type: "success" | "warning" | "error";
  message: string;
} | null;

export function InvitePlayersForm({
  gameId,
  registeredPlayers,
}: {
  gameId: string;
  registeredPlayers: InvitableRegisteredPlayer[];
}) {
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
                  ? "Game invite sent. Registered players will see it on their dashboard."
                  : `Sent ${"sent" in result ? result.sent : 0} game invite(s).`,
            });
          }

          router.refresh();
        })
      }
    >
      {feedback ? <FormFeedback type={feedback.type} message={feedback.message} /> : null}
      <InvitePlayersFields
        registeredPlayers={registeredPlayers}
        emailFieldId={`inviteEmails-${gameId}`}
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Sending..." : "Send invites"}
      </Button>
    </form>
  );
}
