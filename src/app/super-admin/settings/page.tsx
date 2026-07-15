import { PlatformSettingsForm } from "@/components/admin/platform-settings-form";
import { requireRole } from "@/lib/auth/session";
import { getAllPlatformSettings } from "@/lib/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SuperAdminSettingsPage() {
  await requireRole("super_admin");
  const settings = await getAllPlatformSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform defaults</CardTitle>
        <CardDescription>Default values for new games.</CardDescription>
      </CardHeader>
      <CardContent>
        <PlatformSettingsForm settings={settings} />
      </CardContent>
    </Card>
  );
}
