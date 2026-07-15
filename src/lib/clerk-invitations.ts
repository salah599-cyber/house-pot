import { clerkClient } from "@clerk/nextjs/server";

import { INVITE_EXPIRY_DAYS } from "@/lib/constants";

type EnsureClerkInvitationInput = {
  emailAddress: string;
  redirectUrl: string;
};

export type EnsureClerkInvitationResult =
  | { invitation: { url?: string; id: string } }
  | { error: string };

export async function ensureClerkInvitation(
  input: EnsureClerkInvitationInput,
): Promise<EnsureClerkInvitationResult> {
  const normalizedEmail = input.emailAddress.trim().toLowerCase();

  try {
    const client = await clerkClient();
    const existing = await client.invitations.getInvitationList({
      query: normalizedEmail,
      status: "pending",
    });

    const pending = existing.data.find(
      (invitation) => invitation.emailAddress.toLowerCase() === normalizedEmail,
    );

    if (pending) {
      return { invitation: pending };
    }

    const invitation = await client.invitations.createInvitation({
      emailAddress: normalizedEmail,
      notify: false,
      redirectUrl: input.redirectUrl,
      ignoreExisting: true,
      expiresInDays: INVITE_EXPIRY_DAYS,
    });

    return { invitation };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create a Clerk invitation.";
    console.error("Failed to ensure Clerk invitation", error);
    return { error: message };
  }
}
