import { CopyInviteLinkButton } from "@/components/admin/copy-invite-link-button";
import { DeletePlatformInviteButton } from "@/components/admin/delete-platform-invite-button";
import { InvitePlayersToPlatformForm } from "@/components/host/invite-players-to-platform-form";
import { HostResendInviteEmailButton } from "@/components/host/host-resend-invite-email-button";
import { WhatsAppShareButton } from "@/components/shared/whatsapp-share-button";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { isInviteEmailDeliveryConfigured } from "@/lib/email";
import { getAppUrl } from "@/lib/invites";
import { platformInviteMessage } from "@/lib/whatsapp-messages";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPendingPlatformInvitesForHost } from "@/server/actions/invites";

export const dynamic = "force-dynamic";

export default async function HostInvitePage() {
  const host = await requireRole("host");
  const pendingInvites = await getPendingPlatformInvitesForHost();
  const emailConfigured = isInviteEmailDeliveryConfigured();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {!emailConfigured ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Invite email is not configured</CardTitle>
            <CardDescription>
              New players are invited through Clerk when possible. If Clerk cannot send email,
              copy links from Pending invites below and share them manually.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Invite players to House Poker</CardTitle>
          <CardDescription>
            Send platform invites without tying them to a specific game. Invited players can
            register, then you can add them to games later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvitePlayersToPlatformForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invites</CardTitle>
          <CardDescription>
            Invites you sent that have not expired yet. Copy the link if email delivery fails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            pendingInvites.map((invite) => {
              const inviteLink = getAppUrl(`/invite/${invite.token}`);

              return (
                <div key={invite.id} className="rounded-lg border border-border p-4 text-sm">
                  <p className="font-medium">{invite.email}</p>
                  <p className="mt-1 text-muted-foreground">
                    Expires {formatDateTime(invite.expiresAt)}
                  </p>
                  <p className="mt-2 break-all text-xs text-muted-foreground">{inviteLink}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CopyInviteLinkButton inviteLink={inviteLink} />
                    <WhatsAppShareButton
                      phone={invite.whatsappPhone}
                      message={platformInviteMessage({
                        inviterName: host.displayName,
                        email: invite.email,
                        inviteLink,
                      })}
                    />
                    <HostResendInviteEmailButton inviteId={invite.id} inviteLink={inviteLink} />
                    <DeletePlatformInviteButton inviteId={invite.id} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
