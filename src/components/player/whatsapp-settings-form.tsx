"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatWhatsAppPhoneForDisplay } from "@/lib/whatsapp";
import { updateWhatsAppPhoneAction } from "@/server/actions/profile";

type WhatsAppSettingsFormProps = {
  currentPhone: string | null;
};

export function WhatsAppSettingsForm({ currentPhone }: WhatsAppSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSaved(false);

        const formData = new FormData(event.currentTarget);
        const phone = String(formData.get("whatsappPhone") ?? "");

        startTransition(async () => {
          const result = await updateWhatsAppPhoneAction(phone);
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }

          setSaved(true);
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="whatsappPhone">WhatsApp number</Label>
        <Input
          id="whatsappPhone"
          name="whatsappPhone"
          type="tel"
          placeholder="+968 9123 4567"
          defaultValue={currentPhone ? formatWhatsAppPhoneForDisplay(currentPhone) : ""}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Hosts can send you registration and settlement messages on WhatsApp when this
          is saved.
        </p>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-400">WhatsApp number saved.</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
