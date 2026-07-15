import { requireDbUser } from "@/lib/auth/session";
import { formatWhatsAppPhoneForDisplay } from "@/lib/whatsapp";
import { WhatsAppSettingsForm } from "@/components/player/whatsapp-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PlayerSettingsPage() {
  const user = await requireDbUser();

  return (
    <div className="page-shell max-w-lg">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Manage how hosts can reach you outside the app.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp</CardTitle>
          <CardDescription>
            {user.whatsappPhone
              ? `Saved as ${formatWhatsAppPhoneForDisplay(user.whatsappPhone)}`
              : "Add your number so hosts can share invites and settlements on WhatsApp."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsAppSettingsForm currentPhone={user.whatsappPhone} />
        </CardContent>
      </Card>
    </div>
  );
}
