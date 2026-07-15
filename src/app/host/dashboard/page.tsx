export const dynamic = "force-dynamic";

import Link from "next/link";
import { formatDateTime, formatMoney } from "@/lib/dates";
import { requireRole } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getHostGames } from "@/server/queries/players";

export default async function HostDashboardPage() {
  await requireRole("host");
  const games = await getHostGames();

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Host dashboard</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Manage your cash games, invites, and seated players.
          </p>
        </div>
        <Button asChild className="min-h-11 w-full sm:w-auto">
          <Link href="/host/games/new">New game</Link>
        </Button>
      </div>

      <section className="grid gap-4">
        {games.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No games yet</CardTitle>
              <CardDescription>Create your first 8-player cash game.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          games.map((game) => {
            const confirmed = game.participants.filter((participant) =>
              ["host", "confirmed", "guest"].includes(participant.status),
            ).length;

            return (
              <Card key={game.id}>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{game.title}</CardTitle>
                    <CardDescription>
                      {formatDateTime(game.scheduledAt)} ·{" "}
                      {formatMoney(game.defaultBuyIn, game.currency)} buy-in
                    </CardDescription>
                  </div>
                  <Badge className="w-fit">{game.status}</Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {confirmed}/{game.maxPlayers} seats confirmed
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
                      <Link href={`/host/games/${game.id}`}>Manage</Link>
                    </Button>
                    {game.status !== "open" ? (
                      <Button asChild className="min-h-11 w-full sm:w-auto">
                      <Link href={`/host/games/${game.id}/live`}>
                        {game.status === "active" ? "Live" : "Results"}
                      </Link>
                    </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
