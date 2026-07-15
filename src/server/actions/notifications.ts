"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireDbUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireDbUser();

  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId));

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
