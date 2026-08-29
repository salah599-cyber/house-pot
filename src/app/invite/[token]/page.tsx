import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

import { WrongInviteAccount } from "@/components/auth/wrong-invite-account";
import { ensureClerkInvitation } from "@/lib/clerk-invitations";
import { APP_NAME } from "@/lib/constants";
import { getAppUrl } from "@/lib/invites";
import { getPlatformInviteByToken } from "@/lib/queries/invites";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type InvitePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const { token } = await params;
  const resolvedSearchParams = await searchParams;
  const gameToken = readSearchParam(resolvedSearchParams, "game");
  const clerkTicket = readSearchParam(resolvedSearchParams, "__clerk_ticket");
  const invite = await getPlatformInviteByToken(token);

  // #region agent log
  await fetch("http://127.0.0.1:7458/ingest/6fe3fac0-761c-4e93-b74f-56ec9db8b46f", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad4f0b" },
    body: JSON.stringify({
      sessionId: "ad4f0b",
      runId: "invite-error",
      hypothesisId: "A",
      location: "src/app/invite/[token]/page.tsx:lookup",
      message: "Invite token lookup",
      data: {
        hasInvite: Boolean(invite),
        status: invite?.status ?? null,
        expired: invite ? invite.expiresAt < new Date() : null,
        hasGameToken: Boolean(gameToken),
        hasClerkTicket: Boolean(clerkTicket),
        tokenLen: token.length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
    // #region agent log
    await fetch("http://127.0.0.1:7458/ingest/6fe3fac0-761c-4e93-b74f-56ec9db8b46f", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad4f0b" },
      body: JSON.stringify({
        sessionId: "ad4f0b",
        runId: "invite-error",
        hypothesisId: "A",
        location: "src/app/invite/[token]/page.tsx:notFound",
        message: "Invite page returning notFound",
        data: {
          reason: !invite ? "missing" : invite.status !== "pending" ? "not_pending" : "expired",
          status: invite?.status ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    notFound();
  }

  const inviteReturnPath = gameToken
    ? `/invite/${token}?game=${encodeURIComponent(gameToken)}`
    : `/invite/${token}`;
  const inviteReturnUrl = getAppUrl(inviteReturnPath);
  const onboardingUrl = gameToken
    ? `/onboarding?invite=${token}&game=${gameToken}`
    : `/onboarding?invite=${token}`;

  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId, sessionStatus } = await auth();
  let signedInEmail: string | null = null;

  if (userId) {
    const clerkUser = await currentUser();
    signedInEmail =
      clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase() ??
      clerkUser?.emailAddresses[0]?.emailAddress?.toLowerCase() ??
      null;
  }

  const emailMatches = Boolean(signedInEmail && signedInEmail === invite.email.toLowerCase());

  // #region agent log
  await fetch("http://127.0.0.1:7458/ingest/6fe3fac0-761c-4e93-b74f-56ec9db8b46f", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad4f0b" },
    body: JSON.stringify({
      sessionId: "ad4f0b",
      runId: "invite-error",
      hypothesisId: "C",
      location: "src/app/invite/[token]/page.tsx:auth",
      message: "Invite page auth state",
      data: {
        hasUserId: Boolean(userId),
        sessionStatus: sessionStatus ?? null,
        hasSignedInEmail: Boolean(signedInEmail),
        emailMatches,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (signedInEmail && signedInEmail !== invite.email.toLowerCase()) {
    return (
      <WrongInviteAccount
        invitedEmail={invite.email}
        signedInEmail={signedInEmail}
        returnPath={inviteReturnPath}
      />
    );
  }

  if (signedInEmail === invite.email.toLowerCase()) {
    redirect(onboardingUrl);
  }

  if (!clerkTicket) {
    const clerkInvite = await ensureClerkInvitation({
      emailAddress: invite.email,
      redirectUrl: inviteReturnUrl,
    });

    // #region agent log
    await fetch("http://127.0.0.1:7458/ingest/6fe3fac0-761c-4e93-b74f-56ec9db8b46f", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad4f0b" },
      body: JSON.stringify({
        sessionId: "ad4f0b",
        runId: "invite-error",
        hypothesisId: "B",
        location: "src/app/invite/[token]/page.tsx:clerkInvite",
        message: "ensureClerkInvitation result",
        data: {
          hasInvitation: "invitation" in clerkInvite,
          hasUrl: "invitation" in clerkInvite ? Boolean(clerkInvite.invitation.url) : false,
          hasError: "error" in clerkInvite,
          error: "error" in clerkInvite ? clerkInvite.error : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if ("invitation" in clerkInvite && clerkInvite.invitation.url) {
      redirect(clerkInvite.invitation.url);
    }

    if ("error" in clerkInvite) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle>Registration is restricted in Clerk</CardTitle>
              <CardDescription>
                {APP_NAME} uses invite-only registration, but Clerk is currently blocking new
                sign-ups.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                In the Clerk Dashboard, open <strong>User &amp; Authentication → Restrictions</strong>{" "}
                and set sign-up mode to <strong>Restricted</strong> (invite-only) or{" "}
                <strong>Public</strong>. Do not leave sign-ups fully disabled.
              </p>
              <p className="break-all text-xs">{clerkInvite.error}</p>
              <Button asChild variant="outline">
                <Link href="/sign-in">Already have an account? Sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-12 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>You&apos;re invited to {APP_NAME}</CardTitle>
          <CardDescription>
            {invite.invitedBy.displayName} invited <strong>{invite.email}</strong> to join
            {invite.targetRole === "host" ? " as a host" : ""}. Registration is invite-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Register with <strong>{invite.email}</strong> to accept this invite.
          </p>
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
          initialValues={{ emailAddress: invite.email }}
        />
      </div>
    </div>
  );
}
