import { cookies } from "next/headers";

import { INVITE_EXPIRY_DAYS } from "@/lib/constants";

export const PLATFORM_INVITE_COOKIE = "hp_platform_invite";

export async function setPlatformInviteCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_INVITE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * INVITE_EXPIRY_DAYS,
  });
}

export async function getPlatformInviteCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(PLATFORM_INVITE_COOKIE)?.value ?? null;
}

export async function clearPlatformInviteCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PLATFORM_INVITE_COOKIE);
}
