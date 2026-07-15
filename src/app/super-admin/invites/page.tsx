import { CopyInviteLinkButton } from "@/components/admin/copy-invite-link-button";
import { DeletePlatformInviteButton } from "@/components/admin/delete-platform-invite-button";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { ResendInviteEmailButton } from "@/components/admin/resend-invite-email-button";
import { WhatsAppShareButton } from "@/components/shared/whatsapp-share-button";
import { requireRole } from "@/lib/auth/session";
import { isInviteEmailDeliveryConfigured } from "@/lib/email";
import { formatDateTime } from "@/lib/dates";
import { getAppUrl } from "@/lib/invites";
import { platformInviteMessage } from "@/lib/whatsapp-messages";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPendingPlatformInvites } from "@/server/actions/invites";

export const dynamic = "force-dynamic";

export default async function SuperAdminInvitesPage() {
  await requireRole("super_admin");
  const pendingInvites = await getPendingPlatformInvites();
  const emailConfigured = isInviteEmailDeliveryConfigured();

  return (
    <div className="space-y-6">
      {!emailConfigured ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Invite email is not configured</CardTitle>
            <CardDescription>
              Invites are saved in House Poker. Clerk sends invitation emails to new users when
              configured. Registered players see invites on their dashboard. If email fails, copy
              the invite link from Pending invites and send it manually.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Invite users</CardTitle>
          <CardDescription>
            Send platform invites by email. Choose player for game registration, or host to
            let them create and manage games after sign-up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invites</CardTitle>
          <CardDescription>Outstanding platform invites that have not expired.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            pendingInvites.map((invite) => {
              const inviteLink = getAppUrl(`/invite/${invite.token}`);

              return (
              <div key={invite.id} className="rounded-lg border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{invite.email}</p>
                  <Badge variant="outline">{invite.targetRole}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  Invited by {invite.invitedBy.displayName} · expires{" "}
                  {formatDateTime(invite.expiresAt)}
                </p>
                <p className="mt-2 break-all text-xs text-muted-foreground">{inviteLink}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyInviteLinkButton inviteLink={inviteLink} />
                  <WhatsAppShareButton
                    phone={invite.whatsappPhone}
                    message={platformInviteMessage({
                      inviterName: invite.invitedBy.displayName,
                      email: invite.email,
                      inviteLink,
                    })}
                  />
                  <ResendInviteEmailButton inviteId={invite.id} inviteLink={inviteLink} />
                  <DeletePlatformInviteButton inviteId={invite.id} />
                </div>
              </div>
            );
            })
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
