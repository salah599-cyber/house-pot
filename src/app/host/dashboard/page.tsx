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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Host dashboard</h1>
          <p className="text-muted-foreground">
            Manage your cash games, invites, and seated players.
          </p>
        </div>
        <Button asChild>
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
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>{game.title}</CardTitle>
                    <CardDescription>
                      {formatDateTime(game.scheduledAt)} ·{" "}
                      {formatMoney(game.defaultBuyIn, game.currency)} buy-in
                    </CardDescription>
                  </div>
                  <Badge>{game.status}</Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {confirmed}/{game.maxPlayers} seats confirmed
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/host/games/${game.id}`}>Manage</Link>
                  </Button>
                  {game.status !== "open" ? (
                    <Button asChild size="sm">
                      <Link href={`/host/games/${game.id}/live`}>
                        {game.status === "active" ? "Live" : "Results"}
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
