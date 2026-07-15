import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { gameInvites, platformInvites } from "@/lib/db/schema";

export async function getPlatformInviteByToken(token: string) {
  return db.query.platformInvites.findFirst({
    where: eq(platformInvites.token, token),
    with: {
      invitedBy: true,
    },
  });
}

export async function getGameInviteByToken(token: string) {
  return db.query.gameInvites.findFirst({
    where: eq(gameInvites.token, token),
    with: {
      game: {
        with: {
          host: true,
        },
      },
    },
  });
}
