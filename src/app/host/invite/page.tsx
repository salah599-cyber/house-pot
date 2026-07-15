import { InvitePlayersToPlatformForm } from "@/components/host/invite-players-to-platform-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function HostInvitePage() {
  return (
    <Card className="max-w-2xl">
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
  );
}
