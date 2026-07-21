"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormFeedback } from "@/components/admin/form-feedback";
import { InvitePlayersFields } from "@/components/games/invite-players-fields";
import { createGameAction } from "@/server/actions/games";
import { BUY_IN_OPTIONS, CURRENCIES, DEFAULT_CURRENCY, DEFAULT_MAX_PLAYERS } from "@/lib/constants";
import type { InvitableRegisteredPlayer } from "@/lib/queries/players";
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

type CreateGameFormProps = {
  registeredPlayers: InvitableRegisteredPlayer[];
  defaults?: {
    currency: string;
    defaultBuyIn: string;
    maxPlayers: string;
  };
};

type FeedbackState = {
  type: "success" | "warning" | "error";
  message: string;
} | null;

export function CreateGameForm({ registeredPlayers, defaults }: CreateGameFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  return (
    <form
      className="space-y-5"
      action={(formData) =>
        startTransition(async () => {
          setFeedback(null);
          const result = await createGameAction(formData);

          if ("error" in result && result.error) {
            setFeedback({ type: "error", message: result.error });
            return;
          }

          if (result.success && result.gameId) {
            const parts: string[] = [];
            if (result.invitesSent && result.invitesSent > 0) {
              parts.push(`${result.invitesSent} invite(s) sent`);
            }
            if (result.guestsAdded && result.guestsAdded > 0) {
              parts.push(`${result.guestsAdded} guest(s) added`);
            }

            if (result.warning) {
              setFeedback({ type: "warning", message: result.warning });
            } else if (parts.length > 0) {
              setFeedback({
                type: "success",
                message: `Game created. ${parts.join(" and ")}.`,
              });
            } else {
              setFeedback({
                type: "success",
                message:
                  "Game created. Select registered players or add guest names on the game page.",
              });
            }

            router.push(`/host/games/${result.gameId}`);
            router.refresh();
          }
        })
      }
    >
      {feedback ? <FormFeedback type={feedback.type} message={feedback.message} /> : null}
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
        <Input id="location" name="location" placeholder="Smith's place" />
      </div>

      <InvitePlayersFields registeredPlayers={registeredPlayers} />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create game"}
      </Button>
    </form>
  );
}
