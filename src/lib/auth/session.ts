import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { isHost, isPlayer, isSuperAdmin } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { userRoles, users, type Role } from "@/lib/db/schema";

export async function getClerkUser() {
  const user = await currentUser();
  if (!user) return null;
  return user;
}

export async function requireAuth() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    redirect("/sign-in");
  }
  return userId;
}

export async function getDbUserByClerkId(clerkId: string) {
  return db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
    with: {
      roles: true,
    },
  });
}

export async function getCurrentDbUser() {
  const clerkUser = await getClerkUser();
  if (!clerkUser) return null;

  return getDbUserByClerkId(clerkUser.id);
}

export async function requireDbUser() {
  const clerkId = await requireAuth();
  const user = await getDbUserByClerkId(clerkId);

  if (!user) {
    redirect("/onboarding");
  }

  if (user.disabled) {
    redirect("/account-disabled");
  }

  return user;
}

export function getUserRoles(user: { roles: { role: Role }[] }) {
  return user.roles.map((entry) => entry.role);
}

export async function requireRole(role: Role) {
  const user = await requireDbUser();
  const roles = getUserRoles(user);

  const allowed =
    role === "super_admin"
      ? isSuperAdmin(roles)
      : role === "host"
        ? isHost(roles)
        : isPlayer(roles);

  if (!allowed) {
    redirect("/");
  }

  return user;
}

export async function seedSuperAdminIfNeeded(email: string, userId: string) {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  if (!superAdminEmail || email.toLowerCase() !== superAdminEmail) {
    return;
  }

  const existingRoles = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, userId),
  });

  const roleSet = new Set(existingRoles.map((entry) => entry.role));
  const toInsert: Role[] = [];

  if (!roleSet.has("super_admin")) toInsert.push("super_admin");
  if (!roleSet.has("host")) toInsert.push("host");
  if (!roleSet.has("player")) toInsert.push("player");

  if (toInsert.length > 0) {
    await db.insert(userRoles).values(
      toInsert.map((role) => ({
        userId,
        role,
      })),
    );
  }
}

export async function grantPlayerRole(userId: string) {
  const existing = await db.query.userRoles.findFirst({
    where: (fields, { and, eq: equals }) =>
      and(equals(fields.userId, userId), equals(fields.role, "player")),
  });

  if (!existing) {
    await db.insert(userRoles).values({ userId, role: "player" });
  }
}

export async function grantHostRole(userId: string) {
  const existing = await db.query.userRoles.findFirst({
    where: (fields, { and, eq: equals }) =>
      and(equals(fields.userId, userId), equals(fields.role, "host")),
  });

  if (!existing) {
    await db.insert(userRoles).values({ userId, role: "host" });
  }
}
