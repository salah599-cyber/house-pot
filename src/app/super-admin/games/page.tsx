import Link from "next/link";

import { CancelGameButton } from "@/components/admin/cancel-game-button";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllGamesAdmin } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function SuperAdminGamesPage() {
  await requireRole("super_admin");
  const games = await getAllGamesAdmin();

  return (
    <Card>
      <CardHeader>
        <CardTitle>All games</CardTitle>
        <CardDescription>Read-only audit view across all hosts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {games.map((game) => (
          <div
            key={game.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
          >
            <div>
              <p className="font-medium">{game.title}</p>
              <p className="text-sm text-muted-foreground">
                Host: {game.host.displayName} · {formatDateTime(game.scheduledAt)} · Code:{" "}
                {game.joinCode}
              </p>
              <div className="mt-2 flex gap-2">
                <Badge>{game.status}</Badge>
                <Badge variant="outline">{game.participants.length} players</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`/host/games/${game.id}`}>View</Link>
              </Button>
              {game.status !== "settled" && game.status !== "cancelled" ? (
                <CancelGameButton gameId={game.id} />
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
