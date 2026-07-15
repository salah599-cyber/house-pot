import { cookies } from "next/headers";

import { INVITE_EXPIRY_DAYS } from "@/lib/constants";

export const PLATFORM_INVITE_COOKIE = "hp_platform_invite";

export function getPlatformInviteCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * INVITE_EXPIRY_DAYS,
  };
}

export function parsePlatformInviteTokenFromPath(pathname: string) {
  const match = pathname.match(/^\/invite\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export async function setPlatformInviteCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_INVITE_COOKIE, token, getPlatformInviteCookieOptions());
}

export async function getPlatformInviteCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(PLATFORM_INVITE_COOKIE)?.value ?? null;
}

export async function clearPlatformInviteCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PLATFORM_INVITE_COOKIE);
}
