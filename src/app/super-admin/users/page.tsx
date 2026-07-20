import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { MakeHostButton } from "@/components/admin/make-host-button";
import { RevokeHostButton } from "@/components/admin/revoke-host-button";
import { ToggleUserButton } from "@/components/admin/toggle-user-button";
import { requireRole } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllUsersAdmin } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function SuperAdminUsersPage() {
  const admin = await requireRole("super_admin");
  const users = await getAllUsersAdmin();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage roles, disable accounts, or permanently delete users.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
          >
            <div>
              <p className="font-medium">
                {user.displayName}
                {user.disabled ? (
                  <Badge variant="destructive" className="ml-2">
                    Disabled
                  </Badge>
                ) : null}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <Badge key={role.id} variant="outline">
                    {role.role}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!user.roles.some((role) => role.role === "host") ? (
                <MakeHostButton userId={user.id} />
              ) : (
                <RevokeHostButton userId={user.id} />
              )}
              <ToggleUserButton userId={user.id} disabled={user.disabled} />
              {user.id !== admin.id ? (
                <DeleteUserButton
                  userId={user.id}
                  displayName={user.displayName}
                  email={user.email}
                />
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
