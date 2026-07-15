import Link from "next/link";
import { notFound } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlatformInviteByToken } from "@/server/queries/players";

type InvitePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ game?: string }>;
};

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const { token } = await params;
  const { game: gameToken } = await searchParams;
  const invite = await getPlatformInviteByToken(token);

  if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
    notFound();
  }

  const onboardingUrl = gameToken
    ? `/onboarding?invite=${token}&game=${gameToken}`
    : `/onboarding?invite=${token}`;

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-12 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>You&apos;re invited to House Poker</CardTitle>
          <CardDescription>
            {invite.invitedBy.displayName} invited <strong>{invite.email}</strong> to join
            {invite.targetRole === "host" ? " as a host" : ""}. Registration is invite-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            After you register, you&apos;ll be able to
            {invite.targetRole === "host"
              ? " create cash games, invite players, and manage live sessions."
              : " confirm your seat for upcoming home games and track your own buy-ins and settlements."}
          </p>
          {invite.targetRole === "host" ? (
            <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sky-300">
              This invite grants host access. You&apos;ll be able to create and run games after
              registration.
            </p>
          ) : null}
          {gameToken ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
              A game seat is waiting for you. You&apos;ll confirm your spot right after
              registration.
            </p>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/sign-in">Already have an account? Sign in</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center">
        <SignUp
          routing="hash"
          forceRedirectUrl={onboardingUrl}
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}
