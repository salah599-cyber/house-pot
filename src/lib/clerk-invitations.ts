import { clerkClient } from "@clerk/nextjs/server";

import { INVITE_EXPIRY_DAYS } from "@/lib/constants";

type EnsureClerkInvitationInput = {
  emailAddress: string;
  redirectUrl: string;
  notify?: boolean;
};

export type EnsureClerkInvitationResult =
  | { invitation: { url?: string; id: string }; emailed: boolean }
  | { error: string };

export async function ensureClerkInvitation(
  input: EnsureClerkInvitationInput,
): Promise<EnsureClerkInvitationResult> {
  const normalizedEmail = input.emailAddress.trim().toLowerCase();
  const shouldNotify = input.notify ?? false;

  try {
    const client = await clerkClient();
    const existing = await client.invitations.getInvitationList({
      query: normalizedEmail,
      status: "pending",
    });

    const pending = existing.data.find(
      (invitation) => invitation.emailAddress.toLowerCase() === normalizedEmail,
    );

    if (pending && !shouldNotify) {
      return { invitation: pending, emailed: false };
    }

    if (pending && shouldNotify) {
      await client.invitations.revokeInvitation(pending.id);
    }

    const invitation = await client.invitations.createInvitation({
      emailAddress: normalizedEmail,
      notify: shouldNotify,
      redirectUrl: input.redirectUrl,
      ignoreExisting: true,
      expiresInDays: INVITE_EXPIRY_DAYS,
    });

    // #region agent log
    await fetch("http://127.0.0.1:7458/ingest/6fe3fac0-761c-4e93-b74f-56ec9db8b46f", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad4f0b" },
      body: JSON.stringify({
        sessionId: "ad4f0b",
        runId: "invite-error",
        hypothesisId: "B",
        location: "src/lib/clerk-invitations.ts:createOk",
        message: "Clerk invitation created",
        data: { reusedPending: Boolean(pending), hasUrl: Boolean(invitation.url) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return { invitation, emailed: shouldNotify };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create a Clerk invitation.";
    const clerkErrors =
      error && typeof error === "object" && "errors" in error
        ? (error as { errors?: { code?: string; message?: string }[] }).errors?.map((item) => ({
            code: item.code ?? null,
            message: item.message ?? null,
          }))
        : null;
    // #region agent log
    await fetch("http://127.0.0.1:7458/ingest/6fe3fac0-761c-4e93-b74f-56ec9db8b46f", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad4f0b" },
      body: JSON.stringify({
        sessionId: "ad4f0b",
        runId: "invite-error",
        hypothesisId: "B",
        location: "src/lib/clerk-invitations.ts:createFail",
        message: "Clerk invitation failed",
        data: { message, clerkErrors },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    console.error("Failed to ensure Clerk invitation", error);
    return { error: message };
  }
}
