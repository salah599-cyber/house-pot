import { requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardStats } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function SuperAdminOverviewPage() {
  await requireRole("super_admin");
  const stats = await getAdminDashboardStats();

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-3xl">{stats.userCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total games</CardDescription>
            <CardTitle className="text-3xl">{stats.gameCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active now</CardDescription>
            <CardTitle className="text-3xl">{stats.activeGames}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Settled</CardDescription>
            <CardTitle className="text-3xl">{stats.settledGames}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit events</CardTitle>
          <CardDescription>Latest platform activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.recentAudit.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{entry.summary}</p>
              <p className="text-muted-foreground">
                {entry.actor?.displayName ?? "System"} · {formatDateTime(entry.createdAt)} ·{" "}
                {entry.action}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
