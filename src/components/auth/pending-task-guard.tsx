"use client";

import { RedirectToTasks } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

import { isSessionTaskPath } from "@/lib/auth/session-tasks";

export function PendingTaskGuard() {
  const pathname = usePathname();

  if (isSessionTaskPath(pathname)) {
    return null;
  }

  return <RedirectToTasks />;
}
