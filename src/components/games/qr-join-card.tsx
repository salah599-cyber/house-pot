import Image from "next/image";

import { getAppUrl } from "@/lib/invites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type QrJoinCardProps = {
  gameId: string;
  joinCode: string;
  title: string;
};

export function QrJoinCard({ gameId, joinCode, title }: QrJoinCardProps) {
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
        <Image
          src={`/api/games/${gameId}/qr`}
          alt={`QR code for ${title}`}
          width={160}
          height={160}
          className="rounded-lg border border-border bg-white p-2"
          unoptimized
        />
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
