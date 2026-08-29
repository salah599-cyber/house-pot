import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);
const email = "salah599@gmail.com";

const users = await sql`
  SELECT id, email, display_name, disabled, created_at FROM users WHERE lower(email) = lower(${email})
`;
const platformInvites = await sql`
  SELECT id, email, status, target_role, created_at, expires_at, accepted_at
  FROM platform_invites WHERE lower(email) = lower(${email}) ORDER BY created_at DESC LIMIT 5
`;
const gameInvites = await sql`
  SELECT gi.id, gi.token, gi.email, gi.status, gi.user_id, gi.created_at, gi.expires_at, g.title AS game_title
  FROM game_invites gi
  JOIN games g ON g.id = gi.game_id
  WHERE lower(gi.email) = lower(${email})
  ORDER BY gi.created_at DESC LIMIT 5
`;
const notifications = await sql`
  SELECT id, type, title, user_id, email, created_at
  FROM notifications WHERE lower(email) = lower(${email}) OR user_id = ${users[0]?.id ?? null}
  ORDER BY created_at DESC LIMIT 10
`;

console.log(JSON.stringify({ registered: users.length > 0, user: users[0] ?? null, platformInvites, gameInvites, notifications }, null, 2));
