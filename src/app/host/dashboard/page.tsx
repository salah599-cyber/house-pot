export const dynamic = "force-dynamic";

import Link from "next/link";

import { HostGameCard } from "@/components/host/host-game-card";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getHostGames } from "@/server/queries/players";

export default async function HostDashboardPage() {
  const games = await getHostGames();

  const active = games.filter((game) => game.status === "active");
  const upcoming = games.filter((game) => game.status === "open");
  const past = games.filter((game) =>
    ["settled", "cancelled", "draft"].includes(game.status),
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Live now</CardDescription>
            <CardTitle className="text-3xl">{active.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming</CardDescription>
            <CardTitle className="text-3xl">{upcoming.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total hosted</CardDescription>
            <CardTitle className="text-3xl">{games.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {games.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No games yet</CardTitle>
            <CardDescription>
              Create your first cash game, invite players, and manage buy-ins from one place.
            </CardDescription>
            <Button asChild className="mt-4 w-full min-h-11 sm:w-auto">
              <Link href="/host/games/new">Create your first game</Link>
            </Button>
          </CardHeader>
        </Card>
      ) : (
        <>
          {active.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Live sessions</h2>
              <div className="grid gap-4">
                {active.map((game) => (
                  <HostGameCard key={game.id} game={game} />
                ))}
              </div>
            </section>
          ) : null}

          {upcoming.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Upcoming games</h2>
              <div className="grid gap-4">
                {upcoming.map((game) => (
                  <HostGameCard key={game.id} game={game} />
                ))}
              </div>
            </section>
          ) : null}

          {past.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Past games</h2>
              <div className="grid gap-4">
                {past.map((game) => (
                  <HostGameCard key={game.id} game={game} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
