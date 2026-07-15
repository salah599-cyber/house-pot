import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="page-shell max-w-5xl py-10 sm:py-16">
      <section className="space-y-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400 sm:text-sm">
          Invite-only home games
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          Run your house poker nights without the spreadsheet chaos
        </h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
          Hosts manage cash games, invite players to register, and track buy-ins.
          Players only see their own results and settlements.
        </p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Button asChild className="min-h-11 w-full sm:w-auto">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Hosts</CardTitle>
            <CardDescription>Create games, invite players, manage seats.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Default 8-player sessions with $20 or $50 buy-ins. Expand to 9 when needed.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Players</CardTitle>
            <CardDescription>Invite-only registration and private dashboards.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Confirm your spot online. First 7 players plus the host fill the table.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Settlements</CardTitle>
            <CardDescription>See who you owe and mark payments settled.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Players only see their own ledger details and settlement pairs.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
