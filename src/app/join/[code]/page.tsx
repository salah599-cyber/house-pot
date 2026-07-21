import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmSpotButtons } from "@/components/games/confirm-spot-buttons";
import { getGameForJoinCode } from "@/lib/auth/game-access";
import { getUserRoles, requireDbUser } from "@/lib/auth/session";
import { formatDateTime, formatAmount } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type JoinPageProps = {
  params: Promise<{ code: string }>;
};

export default async function JoinPage({ params }: JoinPageProps) {
  const user = await requireDbUser();
  const roles = getUserRoles(user);
  const { code } = await params;

  const access = await getGameForJoinCode(code, user.id, user.email, roles);

  if (!access) {
    notFound();
  }

  const { game, invite } = access;

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
              {formatAmount(game.defaultBuyIn)}
            </p>
            <p>
              <span className="text-muted-foreground">Join code:</span>{" "}
              <span className="font-mono font-semibold">{game.joinCode}</span>
            </p>
          </div>

          {!invite ? (
            <p className="text-muted-foreground">
              You have host access to this game. Open it from your host dashboard.
            </p>
          ) : invite.status === "confirmed" ? (
            <div className="space-y-3">
              <p className="text-emerald-400">Your seat is confirmed.</p>
              <Button asChild>
                <Link href={`/player/games/${game.id}`}>View my game</Link>
              </Button>
            </div>
          ) : (
            <ConfirmSpotButtons token={invite.token} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
