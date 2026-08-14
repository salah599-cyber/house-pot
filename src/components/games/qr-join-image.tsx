"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type QrJoinImageProps = {
  joinUrl: string;
  title: string;
};

export function QrJoinImage({ joinUrl, title }: QrJoinImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(joinUrl, { width: 320, margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) {
          setSrc(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  if (!src) {
    return (
      <div
        className="size-40 rounded-lg border border-border bg-muted"
        aria-label={`Loading QR code for ${title}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL from client-side QR generation
    <img
      src={src}
      alt={`QR code for ${title}`}
      width={160}
      height={160}
      className="rounded-lg border border-border bg-white p-2"
    />
  );
}
