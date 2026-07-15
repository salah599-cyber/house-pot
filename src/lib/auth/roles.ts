import type { Role } from "@/lib/db/schema";

export function hasRole(roles: Role[], role: Role) {
  return roles.includes(role);
}

export function isSuperAdmin(roles: Role[]) {
  return hasRole(roles, "super_admin");
}

export function isHost(roles: Role[]) {
  return hasRole(roles, "host") || isSuperAdmin(roles);
}

export function isPlayer(roles: Role[]) {
  return hasRole(roles, "player") || isHost(roles);
}

export function getDefaultDashboardPath(roles: Role[]) {
  if (isSuperAdmin(roles)) return "/super-admin";
  if (isHost(roles)) return "/host";
  return "/player/dashboard";
}
