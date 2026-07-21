import Link from "next/link";
import { notFound } from "next/navigation";

import { QrJoinCard } from "@/components/games/qr-join-card";
import { AddGuestForm } from "@/components/games/add-guest-form";
import { InvitePlayersForm } from "@/components/games/invite-players-form";
import { RemoveGameInviteButton } from "@/components/games/remove-game-invite-button";
import { RemoveGameParticipantButton } from "@/components/games/remove-game-participant-button";
import { StartGameButton } from "@/components/games/live-session-controls";
import { MaxPlayersControl } from "@/components/games/max-players-control";
import { WhatsAppShareButton } from "@/components/shared/whatsapp-share-button";
import { DesktopTable, MobileStack, MobileStackItem } from "@/components/ui/mobile-stack";
import { getUserRoles, requireRole } from "@/lib/auth/session";
import { getGameForHost } from "@/lib/auth/permissions";
import { LocalDateTime } from "@/components/shared/local-datetime";
import { isGameInviteActive } from "@/lib/game-invites";
import { getAppUrl } from "@/lib/invites";
import { getInvitablePlatformInvitees, getInvitableRegisteredPlayers } from "@/lib/queries/players";
import {
  gameInviteRegisteredMessage,
  gameInviteUnregisteredMessage,
} from "@/lib/whatsapp-messages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type HostGamePageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function HostGamePage({ params }: HostGamePageProps) {
  const user = await requireRole("host");
  const { id } = await params;
  const game = await getGameForHost(id, user.id, getUserRoles(user));
  const registeredPlayers = await getInvitableRegisteredPlayers({
    hostUserId: user.id,
    excludeGameId: id,
  });
  const pendingInvitees = await getInvitablePlatformInvitees({
    hostUserId: user.id,
    excludeGameId: id,
  });

  if (!game) {
    notFound();
  }

  const confirmedCount = game.participants.filter((participant) =>
    ["host", "confirmed", "guest"].includes(participant.status),
  ).length;

  const removableParticipantStatuses = new Set(["invited", "declined", "waitlist", "guest"]);
  const canRemoveParticipants = game.status === "open";
  const activeGameInvites = game.invites.filter((invite) => isGameInviteActive(invite));

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 min-h-10">
            <Link href="/host/dashboard">← My games</Link>
          </Button>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="outline">Setup</Badge>
            {game.status !== "open" ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/host/games/${game.id}/live`}>
                  {game.status === "active" ? "Live session" : "Results"}
                </Link>
              </Button>
            ) : null}
          </div>
          <h1 className="page-title">{game.title}</h1>
          <p className="text-muted-foreground">
            <LocalDateTime value={game.scheduledAt} /> · {game.currency} · {game.defaultBuyIn} buy-in
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{game.status}</Badge>
          {game.status === "open" ? <StartGameButton gameId={game.id} /> : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Seats</CardTitle>
            <CardDescription>
              {confirmedCount}/{game.maxPlayers} confirmed. Host is auto-seated; first players
              to confirm online fill the table.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MaxPlayersControl gameId={game.id} maxPlayers={game.maxPlayers} />
            <MobileStack>
              {game.participants.map((participant) => (
                <MobileStackItem key={participant.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {participant.user?.displayName ?? participant.guestName ?? "Invited"}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{participant.status}</Badge>
                      {canRemoveParticipants &&
                      participant.status !== "host" &&
                      removableParticipantStatuses.has(participant.status) ? (
                        <RemoveGameParticipantButton
                          gameId={game.id}
                          participantId={participant.id}
                        />
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    Seat {participant.seatNumber ?? "—"}
                  </p>
                </MobileStackItem>
              ))}
            </MobileStack>
            <DesktopTable>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seat</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {game.participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>{participant.seatNumber ?? "—"}</TableCell>
                    <TableCell>
                      {participant.user?.displayName ?? participant.guestName ?? "Invited"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{participant.status}</Badge>
                        {canRemoveParticipants &&
                        participant.status !== "host" &&
                        removableParticipantStatuses.has(participant.status) ? (
                          <RemoveGameParticipantButton
                            gameId={game.id}
                            participantId={participant.id}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </DesktopTable>
            {canRemoveParticipants && activeGameInvites.length > 0 ? (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm font-medium">Pending email invites</p>
                {activeGameInvites.map((invite) => {
                  const gameInviteLink = getAppUrl(`/game-invite/${invite.token}`);
                  const registrationLink = invite.platformInvite
                    ? getAppUrl(`/invite/${invite.platformInvite.token}?game=${invite.token}`)
                    : gameInviteLink;
                  const whatsappMessage = invite.userId
                    ? gameInviteRegisteredMessage({
                        hostName: user.displayName,
                        gameTitle: game.title,
                        gameInviteLink,
                      })
                    : gameInviteUnregisteredMessage({
                        hostName: user.displayName,
                        gameTitle: game.title,
                        registrationLink,
                      });

                  return (
                  <div
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span>{invite.email}</span>
                    <div className="flex flex-wrap gap-2">
                      <WhatsAppShareButton
                        phone={invite.whatsappPhone}
                        message={whatsappMessage}
                      />
                      <RemoveGameInviteButton gameId={game.id} inviteId={invite.id} />
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <QrJoinCard gameId={game.id} joinCode={game.joinCode} title={game.title} />

          {game.status === "open" ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Invite players</CardTitle>
                  <CardDescription>
                    Select registered players for instant in-app invites. Add guest names for
                    people who will not use the app.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InvitePlayersForm
                    gameId={game.id}
                    registeredPlayers={registeredPlayers}
                    pendingInvitees={pendingInvitees}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Add guest player</CardTitle>
                  <CardDescription>
                    Guests exist only for this game. No account is created for them.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AddGuestForm gameId={game.id} />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Session started</CardTitle>
                <CardDescription>
                  Manage buy-ins, rebuys, and settlements from the live session view.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={`/host/games/${game.id}/live`}>Open live session</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
