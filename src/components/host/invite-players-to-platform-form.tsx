"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { invitePlayersToPlatformAction } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function InvitePlayersToPlatformForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="space-y-3"
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          setMessage(null);

          try {
            const result = await invitePlayersToPlatformAction(formData);

            if ("error" in result) {
              setError(result.error);
              return;
            }

            setMessage(result.message);
            formRef.current?.reset();
            router.refresh();
          } catch {
            setError("Something went wrong while sending invites. Please try again.");
          }
        })
      }
    >
      <Textarea
        name="inviteEmails"
        placeholder="Add emails separated by commas or new lines"
        rows={4}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send platform invites"}
      </Button>
    </form>
  );
}
