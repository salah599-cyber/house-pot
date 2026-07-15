"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { inviteUsersByEmailAction } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      action={(formData) =>
        startTransition(async () => {
          await inviteUsersByEmailAction(formData);
          router.refresh();
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
      <Button type="submit" disabled={isPending}>
        Send invite
      </Button>
    </form>
  );
}
