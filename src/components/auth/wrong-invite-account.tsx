"use client";

import { SignOutButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type WrongInviteAccountProps = {
  invitedEmail: string;
  signedInEmail: string;
  returnPath: string;
};

export function WrongInviteAccount({
  invitedEmail,
  signedInEmail,
  returnPath,
}: WrongInviteAccountProps) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle>Wrong account</CardTitle>
          <CardDescription>
            This invite was sent to <strong>{invitedEmail}</strong>, but you are signed in as{" "}
            <strong>{signedInEmail}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Sign out, then open the invite link again and register with{" "}
            <strong>{invitedEmail}</strong>. Using Google or another email will not work for this
            invite.
          </p>
          <SignOutButton redirectUrl={returnPath}>
            <Button className="w-full">Sign out and use {invitedEmail}</Button>
          </SignOutButton>
        </CardContent>
      </Card>
    </div>
  );
}
