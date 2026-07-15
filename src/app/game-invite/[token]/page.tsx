import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentDbUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { ConfirmSpotButtons } from "@/components/games/confirm-spot-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGameInviteByToken } from "@/server/queries/players";

type GameInvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function GameInvitePage({ params }: GameInvitePageProps) {
  const { token } = await params;
  const invite = await getGameInviteByToken(token);

  if (!invite) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Invite not found</h1>
        <p className="mt-2 text-muted-foreground">This game invite link is invalid.</p>
      </div>
    );
  }

  const currentUser = await getCurrentDbUser();

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

          {!currentUser ? (
            <div className="rounded-lg border border-border p-4">
              <p className="mb-3 text-muted-foreground">
                This invite was sent to <strong>{invite.email}</strong>. Sign in or register
                with that email to confirm your seat.
              </p>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              </div>
            </div>
          ) : currentUser.email.toLowerCase() !== invite.email.toLowerCase() ? (
            <p className="text-destructive">
              You are signed in as {currentUser.email}, but this invite was sent to{" "}
              {invite.email}.
            </p>
          ) : invite.status === "confirmed" ? (
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
