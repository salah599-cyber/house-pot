"use client";

import { usePathname } from "next/navigation";

import { NavLink } from "@/components/ui/nav-link";
import { cn } from "@/lib/utils";

const links = [
  { href: "/host/dashboard", label: "My games", exact: true },
  { href: "/host/invite", label: "Invite players" },
  { href: "/host/games/new", label: "New game" },
];

export function HostNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:overflow-visible md:px-0 md:pb-0">
      {links.map((link) => {
        const active =
          link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <NavLink
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
