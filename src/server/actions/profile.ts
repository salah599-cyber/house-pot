"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireDbUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";

export async function updateWhatsAppPhoneAction(rawPhone: string) {
  const user = await requireDbUser();
  const trimmed = rawPhone.trim();

  if (!trimmed) {
    await db.update(users).set({ whatsappPhone: null }).where(eq(users.id, user.id));
    revalidatePath("/player/settings");
    revalidatePath("/player/dashboard");
    return { success: true };
  }

  const whatsappPhone = normalizeWhatsAppPhone(trimmed);
  if (!whatsappPhone) {
    return { error: "Enter a valid WhatsApp number (e.g. +968 9123 4567)." };
  }

  await db.update(users).set({ whatsappPhone }).where(eq(users.id, user.id));

  revalidatePath("/player/settings");
  revalidatePath("/player/dashboard");
  return { success: true };
}
