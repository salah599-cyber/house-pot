import Link from "next/link";
import { notFound } from "next/navigation";

import { getGameInviteForUser } from "@/lib/auth/game-access";
import { requireDbUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { ConfirmSpotButtons } from "@/components/games/confirm-spot-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GameInvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function GameInvitePage({ params }: GameInvitePageProps) {
  const user = await requireDbUser();
  const { token } = await params;
  const result = await getGameInviteForUser(token, user.id, user.email);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "wrong_account") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Wrong account</h1>
        <p className="mt-3 text-muted-foreground">
          This invite was sent to another email address. Sign out and sign in with the
          invited account, or ask the host for a new invite.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/player/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const { invite } = result;
  const game = invite.game;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{game.title}</CardTitle>
            <Badge variant="secondary">{game.status}</Badge>
          </div>
          <CardDescription>
            Hosted by {game.host.displayName} on {formatDateTime(game.scheduledAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Buy-in:</span> {game.defaultBuyIn}{" "}
              {game.currency}
            </p>
            <p>
              <span className="text-muted-foreground">Seats:</span> up to {game.maxPlayers}{" "}
              players
            </p>
            {game.location ? (
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Location:</span> {game.location}
              </p>
            ) : null}
          </div>

          {invite.status === "confirmed" ? (
            <div className="space-y-3">
              <p className="text-emerald-400">Your seat is confirmed.</p>
              <Button asChild>
                <Link href={`/player/games/${game.id}`}>View my game details</Link>
              </Button>
            </div>
          ) : (
            <ConfirmSpotButtons token={token} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
