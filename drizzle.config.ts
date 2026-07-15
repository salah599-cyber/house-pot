import { neonConfig } from "@neondatabase/serverless";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import ws from "ws";

config({ path: ".env.local" });
config({ path: ".env" });

neonConfig.webSocketConstructor = ws;

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set for drizzle-kit");
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
