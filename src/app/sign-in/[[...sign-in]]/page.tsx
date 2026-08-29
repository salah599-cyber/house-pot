import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

import { Card, CardContent } from "@/components/ui/card";

type SignInPageProps = {
  searchParams: Promise<{ invite_only?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { invite_only: inviteOnly } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-8 sm:py-12">
      {inviteOnly ? (
        <Card className="w-full border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Registration requires an invitation link.{" "}
            <Link href="/" className="text-foreground underline">
              Return home
            </Link>
          </CardContent>
        </Card>
      ) : null}
      <Card className="w-full border-border/60 bg-card/50">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          If you registered with Google, use <strong className="text-foreground">Continue with Google</strong>.
          Password reset only works for accounts that signed up with email and a password.
        </CardContent>
      </Card>
      <SignIn
        routing="path"
        path="/sign-in"
        withSignUp={false}
        fallbackRedirectUrl="/onboarding"
        signInUrl="/sign-in"
        signUpUrl="/sign-in?invite_only=1"
      />
    </div>
  );
}
