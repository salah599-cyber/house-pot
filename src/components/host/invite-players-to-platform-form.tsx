"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormFeedback } from "@/components/admin/form-feedback";
import { invitePlayersToPlatformAction } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type FeedbackState = {
  type: "success" | "warning" | "error";
  message: string;
} | null;

export function InvitePlayersToPlatformForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  return (
    <form
      className="space-y-3"
      action={(formData) =>
        startTransition(async () => {
          setFeedback(null);

          try {
            const result = await invitePlayersToPlatformAction(formData);

            if ("error" in result && result.error) {
              setFeedback({ type: "error", message: result.error });
              return;
            }

            if ("warning" in result && result.warning) {
              setFeedback({
                type: "warning",
                message: `${result.message} ${result.warning}`,
              });
            } else {
              setFeedback({
                type: "success",
                message: ("message" in result && result.message) || "Invites sent.",
              });
            }

            router.refresh();
          } catch {
            setFeedback({
              type: "error",
              message: "Something went wrong while sending invites. Please try again.",
            });
          }
        })
      }
    >
      {feedback ? <FormFeedback type={feedback.type} message={feedback.message} /> : null}
      <Textarea
        name="inviteEmails"
        placeholder="Add emails separated by commas or new lines"
        rows={4}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send platform invites"}
      </Button>
    </form>
  );
}
