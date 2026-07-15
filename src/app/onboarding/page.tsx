import { redirect } from "next/navigation";

import { completeOnboardingAction } from "@/server/actions/onboarding";

type OnboardingPageProps = {
  searchParams: Promise<{ invite?: string; game?: string }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { invite, game } = await searchParams;
  const result = await completeOnboardingAction(invite, game);

  if (result && "error" in result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Registration blocked</h1>
        <p className="mt-3 text-muted-foreground">{result.error}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Open the invitation link from your host or admin email to register.
        </p>
      </div>
    );
  }

  redirect("/player/dashboard");
}
