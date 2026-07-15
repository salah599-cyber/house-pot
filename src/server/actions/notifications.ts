"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireDbUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireDbUser();

  const updated = await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        or(eq(notifications.userId, user.id), eq(notifications.email, user.email)),
      ),
    )
    .returning({ id: notifications.id });

  if (updated.length === 0) {
    return { error: "Notification not found." };
  }

  revalidatePath("/player/dashboard");
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const user = await requireDbUser();

  const unread = await db.query.notifications.findMany({
    where: (fields, { and, eq: equals, or }) =>
      and(or(equals(fields.userId, user.id), equals(fields.email, user.email)), equals(fields.read, false)),
  });

  for (const notification of unread) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notification.id));
  }

  revalidatePath("/player/dashboard");
  return { success: true };
}
