import { UserButton } from "@clerk/nextjs";

import { APP_NAME } from "@/lib/constants";
import { MobileNav } from "@/components/layout/mobile-nav";
import { isHost, isSuperAdmin } from "@/lib/auth/roles";
import { getCurrentDbUser, getUserRoles } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/ui/nav-link";

export async function AppHeader() {
  const user = await getCurrentDbUser();
  const roles = user ? getUserRoles(user) : [];
  const userIsHost = user ? isHost(roles) : false;
  const userIsSuperAdmin = user ? isSuperAdmin(roles) : false;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16">
        <NavLink href="/" className="text-base font-semibold tracking-tight sm:text-lg">
          {APP_NAME}
        </NavLink>

        <nav className="flex items-center gap-2 sm:gap-3">
          {!user ? (
            <Button asChild variant="outline" size="sm" className="min-h-10">
              <NavLink href="/sign-in">Sign in</NavLink>
            </Button>
          ) : (
            <>
              <div className="hidden items-center gap-2 md:flex">
                <Button asChild variant="ghost" size="sm">
                  <NavLink href="/player/dashboard">Dashboard</NavLink>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <NavLink href="/player/stats">Stats</NavLink>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <NavLink href="/player/settings">Settings</NavLink>
                </Button>
                {userIsHost ? (
                  <Button asChild variant="ghost" size="sm">
                    <NavLink href="/host">Host</NavLink>
                  </Button>
                ) : null}
                {userIsSuperAdmin ? (
                  <Button asChild variant="ghost" size="sm">
                    <NavLink href="/super-admin">Admin</NavLink>
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
