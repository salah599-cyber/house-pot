import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
