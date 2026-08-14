import { and, count, eq, max } from "drizzle-orm";

import { isHost, isSuperAdmin } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { gameParticipants, games, transactions, type Role } from "@/lib/db/schema";

export type GameLiveSnapshot = {
  status: (typeof games.$inferSelect)["status"];
  txCount: number;
  latestTxAt: string | null;
};

export async function canAccessGameLiveSnapshot(
  gameId: string,
  userId: string,
  roles: Role[],
) {
  if (isSuperAdmin(roles)) {
    return true;
  }

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { id: true, hostId: true },
  });

  if (!game) {
    return false;
  }

  if (isHost(roles) && game.hostId === userId) {
    return true;
  }

  const participant = await db.query.gameParticipants.findFirst({
    where: and(eq(gameParticipants.gameId, gameId), eq(gameParticipants.userId, userId)),
    columns: { id: true },
  });

  return Boolean(participant);
}

export async function getGameLiveSnapshot(gameId: string): Promise<GameLiveSnapshot | null> {
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { status: true },
  });

  if (!game) {
    return null;
  }

  const [txStats] = await db
    .select({
      txCount: count(),
      latestTxAt: max(transactions.createdAt),
    })
    .from(transactions)
    .where(eq(transactions.gameId, gameId));

  return {
    status: game.status,
    txCount: Number(txStats?.txCount ?? 0),
    latestTxAt: txStats?.latestTxAt?.toISOString() ?? null,
  };
}

export function serializeLiveSnapshot(snapshot: GameLiveSnapshot) {
  return JSON.stringify(snapshot);
}
