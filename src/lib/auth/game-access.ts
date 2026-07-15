import { and, eq, or } from "drizzle-orm";

import { isHost, isSuperAdmin } from "@/lib/auth/roles";
import { isGameInviteActive } from "@/lib/game-invites";
import { db } from "@/lib/db";
import { gameInvites, games, type Role } from "@/lib/db/schema";

export async function getGameForJoinCode(
  joinCode: string,
  userId: string,
  email: string,
  roles: Role[],
) {
  const game = await db.query.games.findFirst({
    where: eq(games.joinCode, joinCode.toUpperCase()),
    with: { host: true },
  });

  if (!game || game.status === "cancelled") {
    return null;
  }

  if (isSuperAdmin(roles)) {
    return { game, invite: null };
  }

  if (isHost(roles) && game.hostId === userId) {
    return { game, invite: null };
  }

  const invite = await db.query.gameInvites.findFirst({
    where: and(
      eq(gameInvites.gameId, game.id),
      or(eq(gameInvites.email, email.toLowerCase()), eq(gameInvites.userId, userId)),
    ),
  });

  if (!invite || !isGameInviteActive(invite)) {
    return null;
  }

  return { game, invite };
}

export async function getGameInviteForUser(token: string, userId: string, email: string) {
  const invite = await db.query.gameInvites.findFirst({
    where: eq(gameInvites.token, token),
    with: {
      game: {
        with: {
          host: true,
        },
      },
    },
  });

  if (!invite) {
    return { status: "not_found" as const };
  }

  if (!isGameInviteActive(invite)) {
    return { status: "expired" as const };
  }

  if (invite.email.toLowerCase() !== email.toLowerCase()) {
    return { status: "wrong_account" as const };
  }

  return { status: "ok" as const, invite };
}
