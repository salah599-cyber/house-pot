import { notFound } from "next/navigation";

import { SettlementPanel } from "@/components/games/settlement-panel";
import { LiveSessionPoller } from "@/components/games/live-session-controls";
import { calculateParticipantTotals } from "@/lib/games/totals";
import { formatDateTime, formatMoney } from "@/lib/dates";
import { requireDbUser } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPlayerGameDetail } from "@/lib/queries/players";

type PlayerGamePageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function PlayerGamePage({ params }: PlayerGamePageProps) {
  await requireDbUser();
  const { id } = await params;
  const detail = await getPlayerGameDetail(id);

  if (!detail?.game || !detail.participant) {
    notFound();
  }

  const { game, participant, myTransactions, mySettlements } = detail;
  const myTotals = calculateParticipantTotals(participant.id, myTransactions);

  return (
    <div className="page-shell max-w-4xl">
      {game.status === "active" ? <LiveSessionPoller /> : null}

      <div>
        <div className="mb-2 flex gap-2">
          <Badge variant="outline">{game.status}</Badge>
        </div>
        <h1 className="page-title">{game.title}</h1>
        <p className="text-muted-foreground">
          Hosted by {game.host.displayName} · {formatDateTime(game.scheduledAt)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Your status</CardDescription>
            <CardTitle>
              <Badge variant="outline">{participant.status}</Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Seat</CardDescription>
            <CardTitle>{participant.seatNumber ?? "Waitlist"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total in</CardDescription>
            <CardTitle>{formatMoney(myTotals.totalIn, game.currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Your net</CardDescription>
            <CardTitle
              className={myTotals.netResult >= 0 ? "text-emerald-400" : "text-rose-400"}
            >
              {formatMoney(myTotals.netResult, game.currency)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My transactions</CardTitle>
          <CardDescription>Only your buy-ins, rebuys, and cash-outs are shown.</CardDescription>
        </CardHeader>
        <CardContent>
          {myTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {game.status === "active"
                ? "No transactions recorded for you yet."
                : "No transactions recorded yet."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.type}</TableCell>
                    <TableCell>
                      {formatMoney(transaction.amount, game.currency)}
                    </TableCell>
                    <TableCell>{formatDateTime(transaction.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {game.status === "settled" ? (
        <SettlementPanel
          gameId={game.id}
          gameDate={game.endedAt ?? game.scheduledAt}
          currency={game.currency}
          participantId={participant.id}
          settlements={mySettlements}
          settlementMarked={participant.settlementMarked}
        />
      ) : null}
    </div>
  );
}
