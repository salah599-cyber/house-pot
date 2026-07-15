import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { assertGameHost } from "@/lib/auth/permissions";
import { getUserRoles, requireDbUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { getAppUrl } from "@/lib/invites";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDbUser();
  const roles = getUserRoles(user);
  const { id } = await context.params;

  const allowed = await assertGameHost(id, user.id, roles);
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const game = await db.query.games.findFirst({
    where: eq(games.id, id),
  });

  if (!game) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const joinUrl = getAppUrl(`/join/${game.joinCode}`);
  const png = await QRCode.toBuffer(joinUrl, { width: 320, margin: 1 });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
    },
  });
}
