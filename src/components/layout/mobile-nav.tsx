"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NavLink } from "@/components/ui/nav-link";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  isHost: boolean;
  isSuperAdmin: boolean;
};

const baseLinks = [
  { href: "/player/dashboard", label: "Dashboard" },
  { href: "/player/stats", label: "Stats" },
  { href: "/player/settings", label: "Settings" },
] as const;

export function MobileNav({ isHost, isSuperAdmin }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    ...baseLinks,
    ...(isHost ? [{ href: "/host", label: "Host" as const }] : []),
    ...(isSuperAdmin ? [{ href: "/super-admin", label: "Admin" as const }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
          <MenuIcon className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton
        className="fixed inset-y-0 right-0 left-auto top-0 flex h-full w-[min(100%,18rem)] max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-l sm:rounded-none"
      >
        <DialogHeader>
          <DialogTitle>Menu</DialogTitle>
        </DialogHeader>
        <nav className="flex flex-col gap-1">
          {links.map((link) => {
        const active =
          link.href === "/host"
            ? pathname === "/host" || pathname.startsWith("/host/")
            : pathname === link.href ||
              (link.href !== "/player/dashboard" && pathname.startsWith(link.href));

            return (
              <NavLink
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "min-h-11 rounded-lg px-4 py-3 text-base font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
