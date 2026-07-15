import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Invite required</CardTitle>
          <CardDescription>
            House Poker is invite-only. You need a personal invitation link from a host or
            admin before you can create an account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            If you received an invite email, open that link to register. Public sign-up is
            not available.
          </p>
          <Button asChild className="w-full">
            <Link href="/sign-in">Sign in to existing account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
