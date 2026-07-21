"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updatePlatformSettingsAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SettingsFormProps = {
  settings: {
    default_buy_in: string;
    default_max_players: string;
  };
};

export function PlatformSettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid max-w-md gap-4"
      action={(formData) =>
        startTransition(async () => {
          await updatePlatformSettingsAction(formData);
          router.refresh();
        })
      }
    >
      <div className="space-y-2">
        <Label htmlFor="default_buy_in">Default buy-in</Label>
        <Select name="default_buy_in" defaultValue={settings.default_buy_in}>
          <SelectTrigger id="default_buy_in">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="default_max_players">Default max players</Label>
        <Select name="default_max_players" defaultValue={settings.default_max_players}>
          <SelectTrigger id="default_max_players">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="8">8</SelectItem>
            <SelectItem value="9">9</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isPending}>
        Save defaults
      </Button>
    </form>
  );
}
