"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { inviteUsersByEmailAction } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteUserForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="space-y-4"
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          setMessage(null);

          try {
            const result = await inviteUsersByEmailAction(formData);

            if ("error" in result) {
              setError(result.error);
              return;
            }

            setMessage(result.message);
            formRef.current?.reset();
            router.refresh();
          } catch {
            setError("Something went wrong while sending the invite. Please try again.");
          }
        })
      }
    >
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
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send invite"}
      </Button>
    </form>
  );
}
