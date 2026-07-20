"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { grantHostRole, requireRole, revokeHostRole } from "@/lib/auth/session";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { auditLogs, games, userRoles, users } from "@/lib/db/schema";
import { upsertPlatformSetting } from "@/lib/settings";
import { count } from "drizzle-orm";

export async function toggleUserDisabledAction(userId: string, disabled: boolean) {
  const admin = await requireRole("super_admin");

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!target) {
    return { error: "User not found." };
  }

  if (target.id === admin.id && disabled) {
    return { error: "You cannot disable your own account." };
  }

  await db.update(users).set({ disabled }).where(eq(users.id, userId));

  await logAudit({
    actorUserId: admin.id,
    action: disabled ? "user_disabled" : "user_enabled",
    entityType: "user",
    entityId: userId,
    summary: `${disabled ? "Disabled" : "Enabled"} user ${target.email}`,
  });

  revalidatePath("/super-admin/users");
  return { success: true };
}

export async function deleteUserAction(userId: string) {
  const admin = await requireRole("super_admin");

  if (userId === admin.id) {
    return { error: "You cannot delete your own account." };
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { roles: true },
  });

  if (!target) {
    return { error: "User not found." };
  }

  if (target.roles.some((role) => role.role === "super_admin")) {
    const superAdmins = await db.query.userRoles.findMany({
      where: eq(userRoles.role, "super_admin"),
    });

    if (superAdmins.length <= 1) {
      return { error: "Cannot delete the only super admin." };
    }
  }

  await logAudit({
    actorUserId: admin.id,
    action: "user_deleted",
    entityType: "user",
    entityId: userId,
    summary: `Deleted user ${target.email}`,
    metadata: { displayName: target.displayName },
  });

  await db.delete(users).where(eq(users.id, userId));

  try {
    const client = await clerkClient();
    await client.users.deleteUser(target.clerkId);
  } catch (error) {
    console.error("Failed to delete Clerk user", error);
  }

  revalidatePath("/super-admin/users");
  revalidatePath("/super-admin");
  return { success: true };
}

export async function promoteUserToHostAction(userId: string) {
  const admin = await requireRole("super_admin");
  await grantHostRole(userId);

  await logAudit({
    actorUserId: admin.id,
    action: "role_granted",
    entityType: "user",
    entityId: userId,
    summary: "Granted host role",
    metadata: { role: "host" },
  });

  revalidatePath("/super-admin/users");
  return { success: true };
}

export async function revokeHostRoleAction(userId: string) {
  const admin = await requireRole("super_admin");

  if (userId === admin.id) {
    return { error: "You cannot revoke your own host role." };
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { roles: true },
  });

  if (!target) {
    return { error: "User not found." };
  }

  if (!target.roles.some((role) => role.role === "host")) {
    return { error: "User is not a host." };
  }

  await revokeHostRole(userId);

  await logAudit({
    actorUserId: admin.id,
    action: "role_revoked",
    entityType: "user",
    entityId: userId,
    summary: "Revoked host role",
    metadata: { role: "host" },
  });

  revalidatePath("/super-admin/users");
  return { success: true };
}

export async function cancelGameAction(gameId: string) {
  const admin = await requireRole("super_admin");

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { error: "Game not found." };
  }

  if (game.status === "settled") {
    return { error: "Settled games cannot be cancelled." };
  }

  await db.update(games).set({ status: "cancelled" }).where(eq(games.id, gameId));

  await logAudit({
    actorUserId: admin.id,
    action: "game_cancelled",
    entityType: "game",
    entityId: gameId,
    summary: `Cancelled game "${game.title}"`,
  });

  revalidatePath("/super-admin/games");
  return { success: true };
}

const settingsSchema = z.object({
  default_currency: z.string().length(3),
  default_buy_in: z.enum(["20", "50"]),
  default_max_players: z.enum(["8", "9"]),
});

export async function updatePlatformSettingsAction(formData: FormData) {
  const admin = await requireRole("super_admin");

  const parsed = settingsSchema.safeParse({
    default_currency: formData.get("default_currency"),
    default_buy_in: formData.get("default_buy_in"),
    default_max_players: formData.get("default_max_players"),
  });

  if (!parsed.success) {
    return { error: "Invalid settings." };
  }

  for (const [key, value] of Object.entries(parsed.data)) {
    await upsertPlatformSetting(key, value);
  }

  await logAudit({
    actorUserId: admin.id,
    action: "settings_updated",
    entityType: "settings",
    summary: "Updated platform defaults",
    metadata: parsed.data,
  });

  revalidatePath("/super-admin/settings");
  return { success: true };
}

export async function getAdminDashboardStats() {
  await requireRole("super_admin");

  const [userCount] = await db.select({ value: count() }).from(users);
  const [gameCount] = await db.select({ value: count() }).from(games);
  const [activeGames] = await db
    .select({ value: count() })
    .from(games)
    .where(eq(games.status, "active"));
  const [settledGames] = await db
    .select({ value: count() })
    .from(games)
    .where(eq(games.status, "settled"));

  return {
    userCount: Number(userCount.value),
    gameCount: Number(gameCount.value),
    activeGames: Number(activeGames.value),
    settledGames: Number(settledGames.value),
  };
}

export async function getAuditLogs(limit = 100) {
  await requireRole("super_admin");

  const cappedLimit = Math.min(Math.max(1, limit), 200);

  return db.query.auditLogs.findMany({
    orderBy: [desc(auditLogs.createdAt)],
    limit: cappedLimit,
    with: { actor: true },
  });
}

export async function getAllUsersAdmin() {
  await requireRole("super_admin");

  return db.query.users.findMany({
    with: { roles: true },
    orderBy: [desc(users.createdAt)],
  });
}

export async function getAllGamesAdmin() {
  await requireRole("super_admin");

  return db.query.games.findMany({
    orderBy: [desc(games.createdAt)],
    with: {
      host: true,
      participants: true,
    },
    limit: 100,
  });
}
