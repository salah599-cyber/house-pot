"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { addGuestPlayerAction } from "@/server/actions/participants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddGuestForm({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex gap-2"
      action={(formData) =>
        startTransition(async () => {
          await addGuestPlayerAction(gameId, formData);
          router.refresh();
        })
      }
    >
      <Input name="guestName" placeholder="Guest name (no account)" required />
      <Button type="submit" size="sm" disabled={isPending}>
        Add guest
      </Button>
    </form>
  );
}
