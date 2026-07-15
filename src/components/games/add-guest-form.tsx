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
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      action={(formData) =>
        startTransition(async () => {
          await addGuestPlayerAction(gameId, formData);
          router.refresh();
        })
      }
    >
      <Input name="guestName" placeholder="Guest name (no account)" required className="min-h-11" />
      <Button type="submit" disabled={isPending} className="min-h-11 w-full sm:w-auto">
        Add guest
      </Button>
    </form>
  );
}
