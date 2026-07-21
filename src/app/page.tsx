import Link from "next/link";
import { ArrowRight, Lock, Spade, Users, Wallet } from "lucide-react";

import { getDefaultDashboardPath, isHost } from "@/lib/auth/roles";
import { getCurrentDbUser, getUserRoles } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Users,
    title: "Hosts run the table",
    description: "Create games, invite players, track buy-ins and cash-outs in one place.",
  },
  {
    icon: Lock,
    title: "Invite-only access",
    description: "No public sign-up. Players join when a host sends them an invite.",
  },
  {
    icon: Wallet,
    title: "Private settlements",
    description: "Each player only sees their own results and who they owe.",
  },
] as const;

export default async function HomePage() {
  const user = await getCurrentDbUser();
  const roles = user ? getUserRoles(user) : [];
  const dashboardPath = user ? getDefaultDashboardPath(roles) : "/sign-in";
  const ctaLabel = user ? "Open dashboard" : "Sign in";

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.12),transparent)]"
      />

      <div className="page-shell relative max-w-4xl py-16 sm:py-24">
        <section className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-400">
            <Spade className="size-3.5" />
            Invite-only home games
          </div>

          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            House Pot nights, without the spreadsheet
          </h1>

          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            A simple ledger for your cash games. Hosts manage the session; players see only
            their own numbers.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
              <Link href={dashboardPath}>
                {ctaLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            {user && isHost(roles) ? (
              <Button asChild variant="outline" size="lg" className="min-h-11 w-full sm:w-auto">
                <Link href="/host">Host center</Link>
              </Button>
            ) : null}
          </div>
        </section>

        <section className="mt-20 grid gap-10 border-t border-border/60 pt-16 sm:grid-cols-3 sm:gap-8">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="text-center sm:text-left">
              <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-lg border border-border/60 bg-card sm:mx-0">
                <Icon className="size-4 text-emerald-400" strokeWidth={1.75} />
              </div>
              <h2 className="text-sm font-medium">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </section>

        <p className="mt-16 text-center text-xs text-muted-foreground">
          20 / 50 buy-ins · 8–9 players per table
        </p>
      </div>
    </div>
  );
}
