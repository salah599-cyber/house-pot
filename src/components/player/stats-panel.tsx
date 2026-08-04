import { formatAmount, formatSettlementDate } from "@/lib/dates";

type StatsPanelProps = {
  stats: {
    sessionsPlayed: number;
    activeGames: number;
    winningSessions: number;
    winRate: number;
    totalNet: number;
    avgSessionResult: number;
    totalBuyInVolume: number;
    sessionResults: Array<{
      title: string;
      scheduledAt: Date;
      netResult: number;
    }>;
    netByMonth: Array<{ month: string; net: number }>;
  };
};

export function StatsPanel({ stats }: StatsPanelProps) {
  const maxAbsNet = Math.max(
    ...stats.netByMonth.map((entry) => Math.abs(entry.net)),
    1,
  );

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sessions played" value={String(stats.sessionsPlayed)} />
        <StatCard label="Win rate" value={`${stats.winRate.toFixed(0)}%`} />
        <StatCard
          label="Total P&L"
          value={formatAmount(stats.totalNet)}
          highlight={stats.totalNet >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Avg session"
          value={formatAmount(stats.avgSessionResult)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-5">
          <h2 className="mb-4 font-semibold">Monthly P&L</h2>
          {stats.netByMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No settled games yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.netByMonth.map((entry) => (
                <div key={entry.month}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{entry.month}</span>
                    <span className={entry.net >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {formatAmount(entry.net)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${entry.net >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                      style={{ width: `${(Math.abs(entry.net) / maxAbsNet) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border p-5">
          <h2 className="mb-4 font-semibold">Recent sessions</h2>
          {stats.sessionResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">Play a settled game to see history.</p>
          ) : (
            <div className="space-y-3">
              {stats.sessionResults.map((session) => (
                <div
                  key={session.title + session.scheduledAt.toISOString()}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-muted-foreground">
                      {formatSettlementDate(session.scheduledAt)}
                    </p>
                  </div>
                  <span
                    className={
                      session.netResult >= 0 ? "text-emerald-400" : "text-rose-400"
                    }
                  >
                    {formatAmount(session.netResult)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          highlight === "positive"
            ? "text-emerald-400"
            : highlight === "negative"
              ? "text-rose-400"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
