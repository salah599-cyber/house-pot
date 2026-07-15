import { NextResponse } from "next/server";

import { getPlatformInviteCookie } from "@/lib/auth/invite-cookie";
import { completeOnboardingAction } from "@/server/actions/onboarding";

export async function POST(request: Request) {
  const setup = new URL(request.url).searchParams.get("setup") ?? undefined;
  const inviteToken = await getPlatformInviteCookie();
  const result = await completeOnboardingAction(inviteToken ?? undefined, undefined, setup);

  if (result && "error" in result) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
