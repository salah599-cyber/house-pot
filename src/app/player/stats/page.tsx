import { StatsPanel } from "@/components/player/stats-panel";
import { requireDbUser } from "@/lib/auth/session";
import { getPlayerStats } from "@/server/queries/stats";

export const dynamic = "force-dynamic";

export default async function PlayerStatsPage() {
  await requireDbUser();
  const stats = await getPlayerStats();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">My stats</h1>
        <p className="text-muted-foreground">
          Private performance from your settled games only.
        </p>
      </div>
      <StatsPanel stats={stats} />
    </div>
  );
}
