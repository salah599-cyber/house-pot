import { HostNav } from "@/components/host/host-nav";
import { requireRole } from "@/lib/auth/session";

export default async function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await requireRole("host");

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
            Host center
          </p>
          <h1 className="page-title">My hosted games</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {dbUser.displayName} · create games, invite players, and run live sessions.
          </p>
        </div>
      </div>
      <HostNav />
      {children}
    </div>
  );
}
