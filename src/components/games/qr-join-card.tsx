import { getAppUrl } from "@/lib/invites";
import { QrJoinImage } from "@/components/games/qr-join-image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type QrJoinCardProps = {
  joinCode: string;
  title: string;
};

export function QrJoinCard({ joinCode, title }: QrJoinCardProps) {
  const joinUrl = getAppUrl(`/join/${joinCode}`);

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR join code</CardTitle>
        <CardDescription>
          Players scan to open {title}. They must still be on the guest list to confirm a seat.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <QrJoinImage joinUrl={joinUrl} title={title} />
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Join code:</span>{" "}
            <span className="font-mono text-lg font-semibold tracking-widest">{joinCode}</span>
          </p>
          <p className="break-all text-muted-foreground">{joinUrl}</p>
        </div>
      </CardContent>
    </Card>
  );
}
