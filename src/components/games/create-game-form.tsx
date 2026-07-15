"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { createGameAction } from "@/server/actions/games";
import { BUY_IN_OPTIONS, CURRENCIES, DEFAULT_CURRENCY, DEFAULT_MAX_PLAYERS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CreateGameFormProps = {
  defaults?: {
    currency: string;
    defaultBuyIn: string;
    maxPlayers: string;
  };
};

export function CreateGameForm({ defaults }: CreateGameFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      action={(formData) =>
        startTransition(async () => {
          const result = await createGameAction(formData);
          if (result.success && result.gameId) {
            router.push(`/host/games/${result.gameId}`);
            router.refresh();
          }
        })
      }
    >
      <div className="space-y-2">
        <Label htmlFor="title">Game title</Label>
        <Input id="title" name="title" placeholder="Friday Night Cash Game" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select name="currency" defaultValue={defaults?.currency ?? DEFAULT_CURRENCY}>
            <SelectTrigger id="currency">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultBuyIn">First buy-in</Label>
          <Select name="defaultBuyIn" defaultValue={defaults?.defaultBuyIn ?? "50"}>
            <SelectTrigger id="defaultBuyIn">
              <SelectValue placeholder="Buy-in amount" />
            </SelectTrigger>
            <SelectContent>
              {BUY_IN_OPTIONS.map((amount) => (
                <SelectItem key={amount} value={String(amount)}>
                  {amount}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="maxPlayers">Max players (including host)</Label>
          <Select
            name="maxPlayers"
            defaultValue={defaults?.maxPlayers ?? String(DEFAULT_MAX_PLAYERS)}
          >
            <SelectTrigger id="maxPlayers">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="8">8 (host + 7 players)</SelectItem>
              <SelectItem value="9">9 (host + 8 players)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduledAt">Date & time</Label>
          <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location (optional)</Label>
        <Input id="location" name="location" placeholder="Salah's place" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="inviteEmails">Invite player emails</Label>
        <Textarea
          id="inviteEmails"
          name="inviteEmails"
          placeholder="player1@email.com, player2@email.com"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Unregistered players receive an invite to register. Registered players get a game
          notification to confirm their seat.
        </p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create game & send invites"}
      </Button>
    </form>
  );
}
