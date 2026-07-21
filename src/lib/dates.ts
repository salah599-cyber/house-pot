import { APP_TIMEZONE } from "@/lib/constants";

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const dateTimeFormatOptions: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: APP_TIMEZONE,
};

const dateFormatOptions: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeZone: APP_TIMEZONE,
};

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", dateTimeFormatOptions).format(new Date(value));
}

/**
 * Parse a `datetime-local` value (no timezone) as Gulf time (Oman/UAE).
 */
export function parseScheduledAt(value: string) {
  const normalized = value.length === 16 ? `${value}:00` : value;
  const offset = normalized.includes("+") || normalized.endsWith("Z") ? "" : "+04:00";
  return new Date(`${normalized}${offset}`);
}

export function formatMoney(amount: string | number, currency: string) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatSettlementDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", dateFormatOptions).format(new Date(value));
}

export function formatSettlementAmount(amount: string | number) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (Math.abs(value - Math.round(value)) < 0.009) {
    return String(Math.round(value));
  }

  return String(Math.round(value * 100) / 100);
}
