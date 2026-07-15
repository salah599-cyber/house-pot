import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmSpotButtons } from "@/components/games/confirm-spot-buttons";
import { getCurrentDbUser } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/dates";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type JoinPageProps = {
  params: Promise<{ code: string }>;
};

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  const game = await db.query.games.findFirst({
    where: (fields, { eq: equals }) => equals(fields.joinCode, code.toUpperCase()),
    with: { host: true },
  });

  if (!game || game.status === "cancelled") {
    notFound();
  }

  const currentUser = await getCurrentDbUser();
  let invite = null;

  if (currentUser) {
    invite = await db.query.gameInvites.findFirst({
      where: (fields, { and, eq: equals, or }) =>
        and(
          equals(fields.gameId, game.id),
          or(equals(fields.email, currentUser.email), equals(fields.userId, currentUser.id)),
        ),
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{game.title}</CardTitle>
            <Badge>{game.status}</Badge>
          </div>
          <CardDescription>
            Hosted by {game.host.displayName} · {formatDateTime(game.scheduledAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Buy-in:</span>{" "}
              {formatMoney(game.defaultBuyIn, game.currency)}
            </p>
            <p>
              <span className="text-muted-foreground">Join code:</span>{" "}
              <span className="font-mono font-semibold">{game.joinCode}</span>
            </p>
          </div>

          {!currentUser ? (
            <div className="rounded-lg border border-border p-4">
              <p className="mb-3 text-muted-foreground">
                Sign in to confirm your seat. You must be invited by the host first.
              </p>
              <Button asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          ) : invite ? (
            invite.status === "confirmed" ? (
              <div className="space-y-3">
                <p className="text-emerald-400">Your seat is confirmed.</p>
                <Button asChild>
                  <Link href={`/player/games/${game.id}`}>View my game</Link>
                </Button>
              </div>
            ) : (
              <ConfirmSpotButtons token={invite.token} />
            )
          ) : (
            <p className="text-muted-foreground">
              You&apos;re signed in as {currentUser.email}, but you&apos;re not on the guest
              list for this game. Ask {game.host.displayName} to invite you.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
