"use client";

import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

type WhatsAppShareButtonProps = {
  phone?: string | null;
  message: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
};

export function WhatsAppShareButton({
  phone,
  message,
  size = "sm",
  variant = "outline",
}: WhatsAppShareButtonProps) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={() => {
        window.open(buildWhatsAppUrl(phone, message), "_blank", "noopener,noreferrer");
      }}
    >
      WhatsApp
    </Button>
  );
}
