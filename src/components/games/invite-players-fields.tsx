import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type {
  InvitablePlatformInvitee,
  InvitableRegisteredPlayer,
} from "@/lib/queries/players";

type InvitePlayersFieldsProps = {
  registeredPlayers: InvitableRegisteredPlayer[];
  pendingInvitees?: InvitablePlatformInvitee[];
  guestNamesFieldId?: string;
  inviteEmailsFieldId?: string;
};

export function InvitePlayersFields({
  registeredPlayers,
  pendingInvitees = [],
  guestNamesFieldId = "guestNames",
  inviteEmailsFieldId = "inviteEmails",
}: InvitePlayersFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Registered players</Label>
        {registeredPlayers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            No registered players available yet. Use Host → Invite to add players to the
            platform, or add guest names below for people who will not use the app.
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
        <Label>Pending platform invites</Label>
        {pendingInvitees.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            No pending platform invites. Use Host → Invite to add players, or enter their email
            below.
          </p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
            {pendingInvitees.map((invitee) => (
              <label
                key={invitee.email}
                htmlFor={`invite-pending-${invitee.email}`}
                className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50"
              >
                <input
                  id={`invite-pending-${invitee.email}`}
                  type="checkbox"
                  name="invitePendingEmails"
                  value={invitee.email}
                  className="mt-1 size-4 rounded border-input"
                />
                <span className="min-w-0 text-sm">
                  <span className="block font-medium">{invitee.email}</span>
                  <span className="block text-muted-foreground">
                    Invited to House Poker, not registered yet
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          These players can register and accept the game invite from their dashboard.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={inviteEmailsFieldId}>Invite by email</Label>
        <Textarea
          id={inviteEmailsFieldId}
          name="inviteEmails"
          placeholder={"husain@example.com\nalex@example.com"}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          One email per line. Unregistered players receive a registration link tied to this game.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={guestNamesFieldId}>Guest players (no account)</Label>
        <Textarea
          id={guestNamesFieldId}
          name="guestNames"
          placeholder={"Alex\nSam\nJordan"}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          One name per line. Guests are not notified and cannot accept invites in the app. To invite
          someone who should register, use their email above instead.
        </p>
      </div>
    </div>
  );
}
