import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { InvitableRegisteredPlayer } from "@/lib/queries/players";

type InvitePlayersFieldsProps = {
  registeredPlayers: InvitableRegisteredPlayer[];
  emailFieldId?: string;
};

export function InvitePlayersFields({
  registeredPlayers,
  emailFieldId = "inviteEmails",
}: InvitePlayersFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Registered players</Label>
        {registeredPlayers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            No registered players available yet. Use Host → Invite to add players to the
            platform, or enter unregistered emails below.
          </p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
            {registeredPlayers.map((player) => (
              <label
                key={player.id}
                htmlFor={`invite-player-${player.id}`}
                className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50"
              >
                <input
                  id={`invite-player-${player.id}`}
                  type="checkbox"
                  name="invitePlayerIds"
                  value={player.id}
                  className="mt-1 size-4 rounded border-input"
                />
                <span className="min-w-0 text-sm">
                  <span className="block font-medium">{player.displayName}</span>
                  <span className="block text-muted-foreground">{player.email}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Selected players are invited instantly in the app. No email address needed.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={emailFieldId}>Unregistered player emails</Label>
        <Textarea
          id={emailFieldId}
          name="inviteEmails"
          placeholder="newplayer@email.com"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Only for people who have not registered on House Poker yet. They will receive a
          registration invite for this game.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="inviteWhatsappPhones">WhatsApp numbers (optional)</Label>
        <Textarea
          id="inviteWhatsappPhones"
          name="inviteWhatsappPhones"
          placeholder="+968 9123 4567"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          One number per email line, in the same order. Used when you share invites on WhatsApp.
        </p>
      </div>
    </div>
  );
}
