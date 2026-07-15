import { randomBytes } from "crypto";

import { addDays } from "./dates";
import { INVITE_EXPIRY_DAYS } from "@/lib/constants";

export function createInviteToken() {
  return randomBytes(32).toString("hex");
}

export function getInviteExpiryDate() {
  return addDays(new Date(), INVITE_EXPIRY_DAYS);
}

export function getAppUrl(path = "") {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}${path}`;
}
