import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getUserRoles, getDbUserByClerkId } from "@/lib/auth/session";
import {
  canAccessGameLiveSnapshot,
  getGameLiveSnapshot,
} from "@/lib/games/live-snapshot";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { isAuthenticated, userId: clerkId } = await auth();

  if (!isAuthenticated || !clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getDbUserByClerkId(clerkId);

  if (!user || user.disabled) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const roles = getUserRoles(user);
  const allowed = await canAccessGameLiveSnapshot(id, user.id, roles);

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshot = await getGameLiveSnapshot(id);

  if (!snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
