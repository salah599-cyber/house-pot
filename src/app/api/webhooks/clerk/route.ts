import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(request);
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  if (event.type === "user.deleted") {
    const clerkId = event.data.id;
    if (!clerkId) {
      return new Response("OK", { status: 200 });
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (existing && !existing.disabled) {
      await db.update(users).set({ disabled: true }).where(eq(users.clerkId, clerkId));
      await logAudit({
        actorUserId: existing.id,
        action: "user_disabled",
        entityType: "user",
        entityId: existing.id,
        summary: `Disabled user after Clerk account deletion: ${existing.email}`,
        metadata: { source: "clerk_webhook" },
      });
    }
  }

  if (event.type === "user.updated") {
    const clerkId = event.data.id;
    const displayName =
      [event.data.first_name, event.data.last_name].filter(Boolean).join(" ") ||
      event.data.username ||
      undefined;

    if (clerkId && displayName) {
      await db
        .update(users)
        .set({ displayName })
        .where(eq(users.clerkId, clerkId));
    }
  }

  return new Response("OK", { status: 200 });
}
