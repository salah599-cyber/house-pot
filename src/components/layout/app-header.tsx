import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { MobileNav } from "@/components/layout/mobile-nav";
import { isHost, isSuperAdmin } from "@/lib/auth/roles";
import { getCurrentDbUser, getUserRoles } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export async function AppHeader() {
  const user = await getCurrentDbUser();
  const roles = user ? getUserRoles(user) : [];
  const userIsHost = user ? isHost(roles) : false;
  const userIsSuperAdmin = user ? isSuperAdmin(roles) : false;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16">
        <Link href="/" className="text-base font-semibold tracking-tight sm:text-lg">
          House Poker
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {!user ? (
            <Button asChild variant="outline" size="sm" className="min-h-10">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          ) : (
            <>
              <div className="hidden items-center gap-2 md:flex">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/player/dashboard">Dashboard</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/player/stats">Stats</Link>
                </Button>
                {userIsHost ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/host">Host</Link>
                  </Button>
                ) : null}
                {userIsSuperAdmin ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/super-admin">Admin</Link>
                  </Button>
                ) : null}
              </div>
              <MobileNav isHost={userIsHost} isSuperAdmin={userIsSuperAdmin} />
              <UserButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
