import { NextResponse } from "next/server";

import { getPlatformInviteCookie } from "@/lib/auth/invite-cookie";
import { completeOnboardingAction } from "@/server/actions/onboarding";

export async function POST() {
  const inviteToken = await getPlatformInviteCookie();
  const result = await completeOnboardingAction(inviteToken ?? undefined);

  if (result && "error" in result) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
