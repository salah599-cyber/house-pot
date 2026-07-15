import Link from "next/link";
import { notFound } from "next/navigation";

import { LiveGameActions } from "@/components/games/live-game-actions";
import { LiveSeatMap } from "@/components/games/live-seat-map";
import { LiveSessionPoller } from "@/components/games/live-session-controls";
import { WhatsAppShareButton } from "@/components/shared/whatsapp-share-button";
import { DesktopTable, MobileStack, MobileStackItem } from "@/components/ui/mobile-stack";
import { getUserRoles, requireRole } from "@/lib/auth/session";
import { getGameForHost } from "@/lib/auth/permissions";
import {
  calculateAllParticipantTotals,
  participantDisplayName,
} from "@/lib/games/totals";
import { formatDateTime, formatMoney } from "@/lib/dates";
import { buildSettlementWhatsAppMessage } from "@/lib/whatsapp-messages";
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
      <div className="mx-auto max-w-lg text-center">
        <h1 className="page-title">Game not started yet</h1>
        <p className="mt-2 text-muted-foreground">
          Start the live session from the game setup page once players are seated.
        </p>
        <Button asChild className="mt-6 min-h-11 w-full sm:w-auto">
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
  const showMobileBar = game.status === "active";
  const settlementDate = game.endedAt ?? game.scheduledAt;

  return (
    <div className={`flex w-full flex-col gap-6 ${showMobileBar ? "pb-24 sm:pb-0" : ""}`}>
      <LiveSessionPoller />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="min-h-10">
              <Link href={`/host/games/${game.id}`}>Setup</Link>
            </Button>
            <Badge>Live session</Badge>
          </div>
          <h1 className="page-title">{game.title}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {formatDateTime(game.scheduledAt)} · Pot in play:{" "}
            {formatMoney(potTotal, game.currency)}
          </p>
        </div>

        <LiveGameActions
          gameId={game.id}
          currency={game.currency}
          status={game.status}
          seatedPlayers={seatedPlayers}
          totalsByParticipant={totalsByParticipant}
        />
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
            <MobileStack>
              {seatedPlayers.map((player) => {
                const playerTotals = totalsByParticipant[player.id];
                return (
                  <MobileStackItem key={player.id}>
                    <p className="font-medium">{participantDisplayName(player)}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-muted-foreground">
                      <div>
                        <p className="text-xs uppercase">In</p>
                        <p className="text-foreground">
                          {formatMoney(playerTotals?.totalIn ?? 0, game.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase">Out</p>
                        <p className="text-foreground">
                          {formatMoney(playerTotals?.totalCashOut ?? 0, game.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase">Net</p>
                        <p className="text-foreground">
                          {formatMoney(playerTotals?.netResult ?? 0, game.currency)}
                        </p>
                      </div>
                    </div>
                  </MobileStackItem>
                );
              })}
            </MobileStack>
            <DesktopTable>
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
            </DesktopTable>
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
            <MobileStack>
              {game.settlementLines.map((line) => {
                const whatsappMessage = buildSettlementWhatsAppMessage({
                  date: settlementDate,
                  lines: [
                    {
                      fromName: participantDisplayName(line.fromParticipant),
                      toName: participantDisplayName(line.toParticipant),
                      amount: line.amount,
                    },
                  ],
                });

                return (
                <MobileStackItem key={line.id}>
                  <p className="font-medium">
                    {participantDisplayName(line.fromParticipant)} →{" "}
                    {participantDisplayName(line.toParticipant)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span>{formatMoney(line.amount, game.currency)}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {line.payerMarkedSettled && line.payeeMarkedSettled
                          ? "Settled"
                          : "Pending"}
                      </Badge>
                      <WhatsAppShareButton
                        phone={line.fromParticipant.user?.whatsappPhone}
                        message={whatsappMessage}
                      />
                    </div>
                  </div>
                </MobileStackItem>
                );
              })}
            </MobileStack>
            <DesktopTable>
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
                  {game.settlementLines.map((line) => {
                    const whatsappMessage = buildSettlementWhatsAppMessage({
                      date: settlementDate,
                      lines: [
                        {
                          fromName: participantDisplayName(line.fromParticipant),
                          toName: participantDisplayName(line.toParticipant),
                          amount: line.amount,
                        },
                      ],
                    });

                    return (
                    <TableRow key={line.id}>
                      <TableCell>{participantDisplayName(line.fromParticipant)}</TableCell>
                      <TableCell>{participantDisplayName(line.toParticipant)}</TableCell>
                      <TableCell>{formatMoney(line.amount, game.currency)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>
                            {line.payerMarkedSettled && line.payeeMarkedSettled
                              ? "Settled"
                              : "Pending"}
                          </span>
                          <WhatsAppShareButton
                            phone={line.fromParticipant.user?.whatsappPhone}
                            message={whatsappMessage}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DesktopTable>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
