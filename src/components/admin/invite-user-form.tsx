"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { CopyInviteLinkButton } from "@/components/admin/copy-invite-link-button";
import { FormFeedback } from "@/components/admin/form-feedback";
import { inviteUsersByEmailAction } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FeedbackState = {
  type: "success" | "warning" | "error";
  message: string;
  inviteLink?: string;
} | null;

export function InviteUserForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  return (
    <form
      ref={formRef}
      className="space-y-4"
      action={(formData) =>
        startTransition(async () => {
          setFeedback(null);

          try {
            const result = await inviteUsersByEmailAction(formData);

            if ("error" in result && result.error) {
              setFeedback({ type: "error", message: result.error });
              return;
            }

            if ("warning" in result && result.warning) {
              setFeedback({
                type: "warning",
                message: result.warning,
                inviteLink: result.inviteLink,
              });
            } else {
              setFeedback({
                type: "success",
                message:
                  ("message" in result && result.message) ||
                  "Invite created successfully.",
                inviteLink: "inviteLink" in result ? result.inviteLink : undefined,
              });
              formRef.current?.reset();
            }

            router.refresh();
          } catch {
            setFeedback({
              type: "error",
              message: "Something went wrong while sending the invite. Please try again.",
            });
          }
        })
      }
    >
      {feedback ? (
        <div className="space-y-2">
          <FormFeedback
            type={feedback.type}
            message={feedback.message}
            inviteLink={feedback.inviteLink}
          />
          {feedback.inviteLink ? (
            <CopyInviteLinkButton inviteLink={feedback.inviteLink} />
          ) : null}
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="player@example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsappPhone">WhatsApp number (optional)</Label>
        <Input
          id="whatsappPhone"
          name="whatsappPhone"
          type="tel"
          placeholder="+968 9123 4567"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetRole">Invite as</Label>
        <select
          id="targetRole"
          name="targetRole"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue="player"
        >
          <option value="player">Player</option>
          <option value="host">Host</option>
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send invite"}
      </Button>
    </form>
  );
}
