import { NextResponse } from "next/server";

import { completeOnboardingAction } from "@/server/actions/onboarding";

export async function POST() {
  const result = await completeOnboardingAction();

  if (result && "error" in result) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
