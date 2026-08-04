"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormFeedback } from "@/components/admin/form-feedback";
import { InvitePlayersFields } from "@/components/games/invite-players-fields";
import { invitePlayersAction } from "@/server/actions/games";
import type {
  InvitablePlatformInvitee,
  InvitableRegisteredPlayer,
} from "@/lib/queries/players";
import { Button } from "@/components/ui/button";

type FeedbackState = {
  type: "success" | "warning" | "error";
  message: string;
} | null;

export function InvitePlayersForm({
  gameId,
  registeredPlayers,
  pendingInvitees,
}: {
  gameId: string;
  registeredPlayers: InvitableRegisteredPlayer[];
  pendingInvitees: InvitablePlatformInvitee[];
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
            const parts: string[] = [];
            if ("sent" in result && result.sent) {
              parts.push(`${result.sent} invite(s) sent`);
            }
            if ("guestsAdded" in result && result.guestsAdded) {
              parts.push(`${result.guestsAdded} guest(s) added`);
            }
            setFeedback({
              type: "warning",
              message:
                parts.length > 0
                  ? `${parts.join(" and ")}. ${result.warning}`
                  : result.warning,
            });
          } else {
            const parts: string[] = [];
            if ("sent" in result && result.sent) {
              parts.push(`${result.sent} invite(s) sent`);
            }
            if ("guestsAdded" in result && result.guestsAdded) {
              parts.push(`${result.guestsAdded} guest(s) added`);
            }
            setFeedback({
              type: "success",
              message:
                parts.length > 0
                  ? parts.join(" and ") + "."
                  : "Players updated.",
            });
          }

          router.refresh();
        })
      }
    >
      {feedback ? <FormFeedback type={feedback.type} message={feedback.message} /> : null}
      <InvitePlayersFields
        registeredPlayers={registeredPlayers}
        pendingInvitees={pendingInvitees}
        guestNamesFieldId={`guestNames-${gameId}`}
        inviteEmailsFieldId={`inviteEmails-${gameId}`}
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Saving..." : "Add players"}
      </Button>
    </form>
  );
}
