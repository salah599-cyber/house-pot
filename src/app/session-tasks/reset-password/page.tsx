import { TaskResetPassword } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ResetPasswordTaskPage() {
  const { sessionStatus, isAuthenticated } = await auth();

  if (sessionStatus !== "pending") {
    redirect(isAuthenticated ? "/onboarding" : "/sign-in");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-8 sm:py-12">
      <Card className="w-full border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle>Password reset required</CardTitle>
          <CardDescription>
            Your current password appeared in a data breach. Choose a new password to continue.
            You cannot use House Pot until this is done.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Pick a unique password that you have not used on other sites.
        </CardContent>
      </Card>
      <TaskResetPassword redirectUrlComplete="/onboarding" />
    </div>
  );
}
