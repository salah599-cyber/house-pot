import Link from "next/link";
import { notFound } from "next/navigation";

import { QrJoinCard } from "@/components/games/qr-join-card";
import { AddGuestForm } from "@/components/games/add-guest-form";
import { InvitePlayersForm } from "@/components/games/invite-players-form";
import { StartGameButton } from "@/components/games/live-session-controls";
import { MaxPlayersControl } from "@/components/games/max-players-control";
import { DesktopTable, MobileStack, MobileStackItem } from "@/components/ui/mobile-stack";
import { getUserRoles, requireRole } from "@/lib/auth/session";
import { getGameForHost } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/dates";
import { getInvitableRegisteredPlayers } from "@/lib/queries/players";
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

  if (!game) {
    notFound();
  }

  const confirmedCount = game.participants.filter((participant) =>
    ["host", "confirmed", "guest"].includes(participant.status),
  ).length;

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
            {formatDateTime(game.scheduledAt)} · {game.currency} · {game.defaultBuyIn} buy-in
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
                    <Badge variant="outline">{participant.status}</Badge>
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
                      <Badge variant="outline">{participant.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </DesktopTable>
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
                    Select registered players for instant in-app invites. Add emails only for
                    people not registered yet.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InvitePlayersForm gameId={game.id} registeredPlayers={registeredPlayers} />
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
