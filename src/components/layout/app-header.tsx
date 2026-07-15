import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { isHost, isSuperAdmin } from "@/lib/auth/roles";
import { getCurrentDbUser, getUserRoles } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export async function AppHeader() {
  const user = await getCurrentDbUser();
  const roles = user ? getUserRoles(user) : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          House Poker
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {!user ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/player/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link href="/player/stats">Stats</Link>
              </Button>
              {isHost(roles) ? (
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/host/dashboard">Host</Link>
                </Button>
              ) : null}
              {isSuperAdmin(roles) ? (
                <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
                  <Link href="/super-admin">Admin</Link>
                </Button>
              ) : null}
              <UserButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
