"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyInviteLinkButton({ inviteLink }: { inviteLink: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
