import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  getPlatformInviteCookieOptions,
  parsePlatformInviteTokenFromPath,
  PLATFORM_INVITE_COOKIE,
} from "@/lib/auth/invite-cookie";
import {
  isSessionTaskPath,
  RESET_PASSWORD_TASK_PATH,
} from "@/lib/auth/session-tasks";
import {
  getClientIp,
  rateLimitInvitePage,
  rateLimitJoin,
  rateLimitOnboarding,
  rateLimitWebhook,
} from "@/lib/rate-limit";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/invite/(.*)",
  "/onboarding",
  "/account-disabled",
  "/session-tasks(.*)",
  "/sso-callback(.*)",
  "/api/onboarding",
  "/api/webhooks/clerk",
]);

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname.startsWith("/sign-up")) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("invite_only", "1");
    return NextResponse.redirect(url);
  }

  const { sessionStatus } = await auth();
  const pathname = request.nextUrl.pathname;

  if (sessionStatus === "pending") {
    if (pathname.startsWith("/api/") && pathname !== "/api/webhooks/clerk") {
      return NextResponse.json(
        { error: "Password reset required before continuing." },
        { status: 401 },
      );
    }

    if (!isSessionTaskPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = RESET_PASSWORD_TASK_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const ip = getClientIp(request);

  if (request.nextUrl.pathname.startsWith("/join/")) {
    const limited = await rateLimitJoin(ip);
    if (!limited.success) {
      return NextResponse.json({ error: limited.error }, { status: 429 });
    }
  }

  if (request.nextUrl.pathname.startsWith("/invite/")) {
    const limited = await rateLimitInvitePage(ip);
    if (!limited.success) {
      return NextResponse.json({ error: limited.error }, { status: 429 });
    }

    const inviteToken = parsePlatformInviteTokenFromPath(request.nextUrl.pathname);
    if (inviteToken) {
      const response = NextResponse.next();
      response.cookies.set(PLATFORM_INVITE_COOKIE, inviteToken, getPlatformInviteCookieOptions());
      return response;
    }
  }

  if (request.nextUrl.pathname === "/api/onboarding") {
    const limited = await rateLimitOnboarding(ip);
    if (!limited.success) {
      return NextResponse.json({ error: limited.error }, { status: 429 });
    }
  }

  if (request.nextUrl.pathname === "/api/webhooks/clerk") {
    const limited = await rateLimitWebhook(ip);
    if (!limited.success) {
      return NextResponse.json({ error: limited.error }, { status: 429 });
    }
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
