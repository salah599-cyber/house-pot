import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AccountDisabledPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Account disabled</h1>
      <p className="mt-3 text-muted-foreground">
        Your House Poker account has been disabled. Contact the platform admin if you
        believe this is a mistake.
      </p>
      <Button asChild className="mt-6" variant="outline">
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
