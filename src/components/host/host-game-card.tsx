import Link from "next/link";

import { formatDateTime, formatAmount } from "@/lib/dates";
import type { Game } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GameWithParticipants = Game & {
  participants: { status: string }[];
};

function confirmedCount(game: GameWithParticipants) {
  return game.participants.filter((participant) =>
    ["host", "confirmed", "guest"].includes(participant.status),
  ).length;
}

function statusVariant(status: Game["status"]) {
  if (status === "active") return "default";
  if (status === "open") return "secondary";
  if (status === "settled") return "outline";
  return "destructive";
}

export function HostGameCard({ game }: { game: GameWithParticipants }) {
  const confirmed = confirmedCount(game);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{game.title}</CardTitle>
          <CardDescription>
            {formatDateTime(game.scheduledAt)} · {formatAmount(game.defaultBuyIn)}{" "}
            buy-in
            {game.location ? ` · ${game.location}` : ""}
          </CardDescription>
        </div>
        <Badge variant={statusVariant(game.status)} className="w-fit capitalize">
          {game.status}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {confirmed}/{game.maxPlayers} seats confirmed · Join code{" "}
          <span className="font-mono font-medium text-foreground">{game.joinCode}</span>
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
            <Link href={`/host/games/${game.id}`}>Manage</Link>
          </Button>
          {game.status === "active" ? (
            <Button asChild className="min-h-11 w-full sm:w-auto">
              <Link href={`/host/games/${game.id}/live`}>Live session</Link>
            </Button>
          ) : game.status === "settled" ? (
            <Button asChild className="min-h-11 w-full sm:w-auto">
              <Link href={`/host/games/${game.id}/live`}>Results</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
