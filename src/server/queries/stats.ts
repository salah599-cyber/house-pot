"use server";

import { and, desc, eq, inArray } from "drizzle-orm";

import { calculateParticipantTotals } from "@/lib/games/totals";
import { requireDbUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { gameParticipants, games, transactions } from "@/lib/db/schema";

const playedStatuses = ["host", "confirmed", "guest"] as const;

export async function getPlayerStats() {
  const user = await requireDbUser();

  const participations = await db.query.gameParticipants.findMany({
    where: and(
      eq(gameParticipants.userId, user.id),
      inArray(gameParticipants.status, [...playedStatuses]),
    ),
    with: {
      game: true,
    },
    orderBy: [desc(gameParticipants.createdAt)],
  });

  const settledParticipations = participations.filter(
    (entry) => entry.game.status === "settled",
  );

  const gameIds = settledParticipations.map((entry) => entry.gameId);
  const allTransactions =
    gameIds.length > 0
      ? await db.query.transactions.findMany({
          where: inArray(transactions.gameId, gameIds),
        })
      : [];

  const sessionResults = settledParticipations.map((participation) => {
    const gameTransactions = allTransactions.filter(
      (tx) => tx.gameId === participation.gameId,
    );
    const totals = calculateParticipantTotals(participation.id, gameTransactions);

    return {
      gameId: participation.gameId,
      title: participation.game.title,
      currency: participation.game.currency,
      scheduledAt: participation.game.scheduledAt,
      netResult: totals.netResult,
      totalIn: totals.totalIn,
    };
  });

  const totalNet = sessionResults.reduce((sum, session) => sum + session.netResult, 0);
  const winningSessions = sessionResults.filter((session) => session.netResult > 0).length;
  const totalBuyInVolume = sessionResults.reduce((sum, session) => sum + session.totalIn, 0);
  const sessionsPlayed = sessionResults.length;
  const winRate = sessionsPlayed > 0 ? (winningSessions / sessionsPlayed) * 100 : 0;
  const avgSessionResult = sessionsPlayed > 0 ? totalNet / sessionsPlayed : 0;

  const netByMonth = sessionResults.reduce<Record<string, number>>((acc, session) => {
    const month = new Date(session.scheduledAt).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });
    acc[month] = (acc[month] ?? 0) + session.netResult;
    return acc;
  }, {});

  const activeGames = participations.filter(
    (entry) => entry.game.status === "active" || entry.game.status === "open",
  ).length;

  return {
    sessionsPlayed,
    activeGames,
    winningSessions,
    winRate,
    totalNet,
    avgSessionResult,
    totalBuyInVolume,
    sessionResults: sessionResults.slice(0, 20),
    netByMonth: Object.entries(netByMonth).map(([month, net]) => ({ month, net })),
    primaryCurrency: sessionResults[0]?.currency ?? "USD",
  };
}
