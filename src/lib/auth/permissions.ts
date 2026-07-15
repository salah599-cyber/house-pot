import { and, eq } from "drizzle-orm";

import { isHost, isSuperAdmin } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { games, type Role } from "@/lib/db/schema";

export async function assertGameHost(gameId: string, userId: string, roles: Role[]) {
  if (isSuperAdmin(roles)) return true;
  if (!isHost(roles)) return false;

  const game = await db.query.games.findFirst({
    where: and(eq(games.id, gameId), eq(games.hostId, userId)),
  });

  return Boolean(game);
}

export async function getGameForHost(gameId: string, userId: string, roles: Role[]) {
  const withRelations = {
    participants: {
      with: { user: true },
    },
    invites: {
      with: { platformInvite: true },
    },
    transactions: true,
    settlementLines: {
      with: {
        fromParticipant: { with: { user: true } },
        toParticipant: { with: { user: true } },
      },
    },
  } as const;

  if (isSuperAdmin(roles)) {
    return db.query.games.findFirst({
      where: eq(games.id, gameId),
      with: withRelations,
    });
  }

  if (!isHost(roles)) {
    return null;
  }

  return db.query.games.findFirst({
    where: and(eq(games.id, gameId), eq(games.hostId, userId)),
    with: withRelations,
  });
}
