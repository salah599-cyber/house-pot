import { requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DesktopTable, MobileStack, MobileStackItem } from "@/components/ui/mobile-stack";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuditLogs } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function SuperAdminAuditPage() {
  await requireRole("super_admin");
  const logs = await getAuditLogs(200);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit log</CardTitle>
        <CardDescription>Immutable record of platform actions.</CardDescription>
      </CardHeader>
      <CardContent>
        <MobileStack>
          {logs.map((entry) => (
            <MobileStackItem key={entry.id}>
              <p className="font-medium">{entry.summary}</p>
              <div className="mt-2 space-y-1 text-muted-foreground">
                <p>{formatDateTime(entry.createdAt)}</p>
                <p>{entry.actor?.displayName ?? "—"} · {entry.action}</p>
              </div>
            </MobileStackItem>
          ))}
        </MobileStack>
        <DesktopTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell>{entry.actor?.displayName ?? "—"}</TableCell>
                  <TableCell>{entry.action}</TableCell>
                  <TableCell className="whitespace-normal">{entry.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DesktopTable>
      </CardContent>
    </Card>
  );
}
