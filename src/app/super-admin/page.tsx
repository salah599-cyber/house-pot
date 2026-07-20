import { requireRole } from "@/lib/auth/session";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardStats } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function SuperAdminOverviewPage() {
  await requireRole("super_admin");
  const stats = await getAdminDashboardStats();

  return (
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
  );
}
