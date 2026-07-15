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

    return { invitation, emailed: shouldNotify };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create a Clerk invitation.";
    console.error("Failed to ensure Clerk invitation", error);
    return { error: message };
  }
}
