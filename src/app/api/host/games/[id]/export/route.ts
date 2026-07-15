import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { assertGameHost } from "@/lib/auth/permissions";
import { getUserRoles, requireDbUser } from "@/lib/auth/session";
import {
  calculateAllParticipantTotals,
  participantDisplayName,
} from "@/lib/games/totals";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const occupiedStatuses = ["host", "confirmed", "guest"];

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
    with: {
      participants: { with: { user: true } },
      transactions: true,
      settlementLines: {
        with: {
          fromParticipant: { with: { user: true } },
          toParticipant: { with: { user: true } },
        },
      },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const seated = game.participants.filter((participant) =>
    occupiedStatuses.includes(participant.status),
  );

  const totals = calculateAllParticipantTotals(
    seated.map((participant) => participant.id),
    game.transactions,
  );

  const lines: string[] = [
    "House Poker Game Export",
    `Title,${csv(game.title)}`,
    `Status,${game.status}`,
    `Currency,${game.currency}`,
    `Scheduled,${game.scheduledAt?.toISOString() ?? ""}`,
    "",
    "Player,Seat,Buy-in,Rebuy,Cash-out,Net",
  ];

  for (const participant of seated) {
    const playerTotals = totals.find((entry) => entry.participantId === participant.id);
    lines.push(
      [
        csv(participantDisplayName(participant)),
        participant.seatNumber ?? "",
        playerTotals?.totalBuyIn ?? 0,
        playerTotals?.totalRebuy ?? 0,
        playerTotals?.totalCashOut ?? 0,
        playerTotals?.netResult ?? 0,
      ].join(","),
    );
  }

  if (game.settlementLines.length > 0) {
    lines.push("", "From,To,Amount,Payer Settled,Payee Settled");
    for (const line of game.settlementLines) {
      lines.push(
        [
          csv(participantDisplayName(line.fromParticipant)),
          csv(participantDisplayName(line.toParticipant)),
          line.amount,
          line.payerMarkedSettled,
          line.payeeMarkedSettled,
        ].join(","),
      );
    }
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(game.title)}-export.csv"`,
    },
  });
}

function csv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
