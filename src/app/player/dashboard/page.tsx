import Link from "next/link";

import { MarkAllReadButton } from "@/components/player/mark-all-read-button";
import { formatDateTime, formatMoney } from "@/lib/dates";
import { requireDbUser } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlayerDashboardData } from "@/server/queries/players";

export default async function PlayerDashboardPage() {
  await requireDbUser();
  const { participations, pendingInvites, notifications } = await getPlayerDashboardData();

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">My poker dashboard</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            You only see your games, notifications, and settlement details.
          </p>
        </div>
        <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
          <Link href="/player/stats">View stats</Link>
        </Button>
      </div>

      <section className="grid gap-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Game invites and registration prompts from hosts.</CardDescription>
            </div>
            {notifications.some((n) => !n.read) ? <MarkAllReadButton /> : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-lg border p-4 text-sm ${notification.read ? "border-border" : "border-emerald-500/40 bg-emerald-500/5"}`}
                >
                  <p className="font-medium">{notification.title}</p>
                  <p className="mt-1 text-muted-foreground">{notification.body}</p>
                  <Button asChild size="sm" variant="link" className="mt-2 h-auto px-0">
                    <Link href={notification.link}>Open</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending game invites</CardTitle>
            <CardDescription>Confirm your seat before the table fills up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invites.</p>
            ) : (
              pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{invite.game.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(invite.game.scheduledAt)}
                    </p>
                  </div>
                  <Button asChild className="min-h-11 w-full sm:w-auto">
                    <Link href={`/game-invite/${invite.token}`}>Review invite</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My games</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {participations.length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven&apos;t joined any games yet.</p>
            ) : (
              participations.map((participation) => (
                <div
                  key={participation.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{participation.game.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(participation.game.scheduledAt)} ·{" "}
                      {formatMoney(participation.game.defaultBuyIn, participation.game.currency)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Badge variant="outline" className="w-fit">
                      {participation.status}
                    </Badge>
                    <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
                      <Link href={`/player/games/${participation.gameId}`}>My details</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
