export const CURRENCIES = [
  { code: "OMR", label: "Omani Rial (ر.ع.)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "AED", label: "UAE Dirham (د.إ)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const DEFAULT_CURRENCY: CurrencyCode = "OMR";

export const BUY_IN_OPTIONS = [20, 50] as const;

export const DEFAULT_MAX_PLAYERS = 8;
export const MAX_PLAYERS_CAP = 9;
export const DEFAULT_BUY_IN = 50;

export const INVITE_EXPIRY_DAYS = 14;

export const REBUY_PRESET_MULTIPLIERS = [1, 2, 3, 5, 10] as const;

export const JOIN_CODE_LENGTH = 8;

export const MAX_INVITES_PER_HOUR = 60;

/** Oman and UAE share UTC+4 with no daylight saving. */
export const APP_TIMEZONE = "Asia/Dubai";
