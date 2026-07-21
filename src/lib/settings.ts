import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";

const DEFAULTS = {
  default_buy_in: "50",
  default_max_players: "8",
} as const;

export type PlatformSettings = {
  default_buy_in: string;
  default_max_players: string;
};

export async function getPlatformSetting(key: keyof PlatformSettings) {
  const row = await db.query.platformSettings.findFirst({
    where: (fields, { eq }) => eq(fields.key, key),
  });

  return row?.value ?? DEFAULTS[key];
}

export async function getAllPlatformSettings(): Promise<PlatformSettings> {
  const rows = await db.query.platformSettings.findMany();
  const map = { ...DEFAULTS } as {
    default_buy_in: string;
    default_max_players: string;
  };

  for (const row of rows) {
    if (row.key in map) {
      map[row.key as keyof typeof map] = row.value;
    }
  }

  return map;
}

export async function upsertPlatformSetting(key: string, value: string) {
  await db
    .insert(platformSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
