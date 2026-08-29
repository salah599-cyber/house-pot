import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);
const email = "salah@panoramawindows.net";

const users = await sql`SELECT id, email, display_name FROM users WHERE lower(email) = lower(${email})`;
const platformInvites = await sql`
  SELECT id, email, status, token, created_at, expires_at, accepted_at, target_role
  FROM platform_invites WHERE lower(email) = lower(${email}) ORDER BY created_at DESC LIMIT 3
`;
const gameInvites = await sql`
  SELECT gi.id, gi.email, gi.status, g.title
  FROM game_invites gi JOIN games g ON g.id = gi.game_id
  WHERE lower(gi.email) = lower(${email}) ORDER BY gi.created_at DESC LIMIT 3
`;

console.log(JSON.stringify({ users, platformInvites, gameInvites }, null, 2));
