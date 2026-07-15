import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MobileStack({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("flex flex-col gap-3 md:hidden", className)}>{children}</div>;
}

export function MobileStackItem({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border border-border p-4 text-sm", className)}>{children}</div>
  );
}

export function DesktopTable({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("hidden md:block", className)}>{children}</div>;
}
