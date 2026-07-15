import { config } from "dotenv";
import { neonConfig } from "@neondatabase/serverless";
import { eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import ws from "ws";

import { createJoinCode } from "../src/lib/join-code";
import * as schema from "../src/lib/db/schema";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL not set");
}

const db = drizzle(neon(url), { schema });

async function main() {
  const games = await db.query.games.findMany();
  for (const game of games) {
    if (!("joinCode" in game) || !game.joinCode) {
      await db
        .update(schema.games)
        .set({ joinCode: createJoinCode() })
        .where(eq(schema.games.id, game.id));
    }
  }
  console.log(`Backfilled join codes for ${games.length} games`);
}

main().catch(console.error);
