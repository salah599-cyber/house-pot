export const CURRENCIES = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "AED", label: "UAE Dirham (د.إ)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const BUY_IN_OPTIONS = [20, 50] as const;

export const DEFAULT_MAX_PLAYERS = 8;
export const MAX_PLAYERS_CAP = 9;
export const DEFAULT_BUY_IN = 50;

export const INVITE_EXPIRY_DAYS = 14;
