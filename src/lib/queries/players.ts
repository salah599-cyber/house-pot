import { and, desc, eq, or } from "drizzle-orm";

import { isSuperAdmin } from "@/lib/auth/roles";
import { getUserRoles, requireDbUser } from "@/lib/auth/session";
import { isGameInviteActive } from "@/lib/game-invites";
import { db } from "@/lib/db";
import {
  gameInvites,
  gameParticipants,
  games,
  notifications,
  settlementLines,
  transactions,
  users,
} from "@/lib/db/schema";

export async function getHostGames() {
  const user = await requireDbUser();

  return db.query.games.findMany({
    where: eq(games.hostId, user.id),
    orderBy: [desc(games.scheduledAt)],
    with: {
      participants: true,
    },
  });
}

export async function getPlayerDashboardData() {
  const user = await requireDbUser();

  const participations = await db.query.gameParticipants.findMany({
    where: eq(gameParticipants.userId, user.id),
    with: {
      game: {
        with: {
          host: true,
        },
      },
    },
    orderBy: (fields, { desc: descOrder }) => [descOrder(fields.createdAt)],
  });

  const pendingInviteRows = await db.query.gameInvites.findMany({
    where: and(
      eq(gameInvites.email, user.email),
      or(eq(gameInvites.status, "pending"), eq(gameInvites.status, "registered")),
    ),
    with: {
      game: true,
    },
    orderBy: [desc(gameInvites.sentAt)],
  });

  const pendingInvites = pendingInviteRows.filter((invite) => isGameInviteActive(invite));

  const userNotifications = await db.query.notifications.findMany({
    where: or(eq(notifications.userId, user.id), eq(notifications.email, user.email)),
    orderBy: [desc(notifications.createdAt)],
    limit: 20,
  });

  return {
    participations,
    pendingInvites,
    notifications: userNotifications,
  };
}

export async function getPlayerGameDetail(gameId: string) {
  const user = await requireDbUser();

  const participant = await db.query.gameParticipants.findFirst({
    where: and(
      eq(gameParticipants.gameId, gameId),
      eq(gameParticipants.userId, user.id),
    ),
  });

  if (!participant) {
    return null;
  }

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    with: {
      host: true,
    },
  });

  const myTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.gameId, gameId),
      eq(transactions.participantId, participant.id),
    ),
    orderBy: [desc(transactions.createdAt)],
  });

  const mySettlements = await db.query.settlementLines.findMany({
    where: and(
      eq(settlementLines.gameId, gameId),
      or(
        eq(settlementLines.fromParticipantId, participant.id),
        eq(settlementLines.toParticipantId, participant.id),
      ),
    ),
    with: {
      fromParticipant: {
        with: { user: true },
      },
      toParticipant: {
        with: { user: true },
      },
    },
  });

  return {
    game,
    participant,
    myTransactions,
    mySettlements,
  };
}

export async function getSuperAdminOverview() {
  const user = await requireDbUser();
  const roles = getUserRoles(user);

  if (!isSuperAdmin(roles)) {
    return null;
  }

  const allUsers = await db.query.users.findMany({
    with: { roles: true },
    orderBy: [desc(users.createdAt)],
  });

  const allGames = await db.query.games.findMany({
    orderBy: [desc(games.createdAt)],
    with: {
      host: true,
      participants: true,
    },
    limit: 50,
  });

  return { allUsers, allGames };
}
