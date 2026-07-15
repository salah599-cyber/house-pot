import Link from "next/link";
import { notFound } from "next/navigation";

import { EndGameDialog } from "@/components/games/end-game-dialog";
import { LiveSeatMap } from "@/components/games/live-seat-map";
import { LiveSessionPoller } from "@/components/games/live-session-controls";
import { getUserRoles, requireRole } from "@/lib/auth/session";
import { getGameForHost } from "@/lib/auth/permissions";
import {
  calculateAllParticipantTotals,
  participantDisplayName,
} from "@/lib/games/totals";
import { formatDateTime, formatMoney } from "@/lib/dates";
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

type LiveGamePageProps = {
  params: Promise<{ id: string }>;
};

const occupiedStatuses = ["host", "confirmed", "guest"];

export default async function LiveGamePage({ params }: LiveGamePageProps) {
  const user = await requireRole("host");
  const { id } = await params;
  const game = await getGameForHost(id, user.id, getUserRoles(user));

  if (!game) {
    notFound();
  }

  if (game.status === "open") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Game not started yet</h1>
        <p className="mt-2 text-muted-foreground">
          Start the live session from the game setup page once players are seated.
        </p>
        <Button asChild className="mt-6">
          <Link href={`/host/games/${game.id}`}>Back to setup</Link>
        </Button>
      </div>
    );
  }

  const seatedPlayers = game.participants.filter((participant) =>
    occupiedStatuses.includes(participant.status),
  );

  const totals = calculateAllParticipantTotals(
    seatedPlayers.map((participant) => participant.id),
    game.transactions,
  );

  const totalsByParticipant = Object.fromEntries(
    totals.map((entry) => [entry.participantId, entry]),
  );

  const potTotal = totals.reduce((sum, entry) => sum + entry.totalIn, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <LiveSessionPoller />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/host/games/${game.id}`}>Setup</Link>
            </Button>
            <Badge>Live session</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{game.title}</h1>
          <p className="text-muted-foreground">
            {formatDateTime(game.scheduledAt)} · Pot in play:{" "}
            {formatMoney(potTotal, game.currency)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {game.status === "active" ? (
            <EndGameDialog
              gameId={game.id}
              currency={game.currency}
              seatedPlayers={seatedPlayers}
              totalsByParticipant={totalsByParticipant}
            />
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/api/host/games/${game.id}/export`}>Export CSV</Link>
          </Button>
        </div>
      </div>

      {game.status === "active" ? (
        <LiveSeatMap
          gameId={game.id}
          currency={game.currency}
          defaultBuyIn={game.defaultBuyIn}
          seatedPlayers={seatedPlayers}
          totalsByParticipant={totalsByParticipant}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Final results</CardTitle>
            <CardDescription>Game settled. Settlement transfers below.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seatedPlayers.map((player) => {
                  const playerTotals = totalsByParticipant[player.id];
                  return (
                    <TableRow key={player.id}>
                      <TableCell>{participantDisplayName(player)}</TableCell>
                      <TableCell>
                        {formatMoney(playerTotals?.totalIn ?? 0, game.currency)}
                      </TableCell>
                      <TableCell>
                        {formatMoney(playerTotals?.totalCashOut ?? 0, game.currency)}
                      </TableCell>
                      <TableCell>
                        {formatMoney(playerTotals?.netResult ?? 0, game.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {game.status === "settled" && game.settlementLines.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Settlement transfers</CardTitle>
            <CardDescription>Who pays whom after the game.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {game.settlementLines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      {participantDisplayName(line.fromParticipant)}
                    </TableCell>
                    <TableCell>{participantDisplayName(line.toParticipant)}</TableCell>
                    <TableCell>{formatMoney(line.amount, game.currency)}</TableCell>
                    <TableCell>
                      {line.payerMarkedSettled && line.payeeMarkedSettled
                        ? "Settled"
                        : "Pending"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
