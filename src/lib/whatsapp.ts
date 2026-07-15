const DEFAULT_COUNTRY_CODE = "968";

export function normalizeWhatsAppPhone(
  raw: string,
  defaultCountryCode = DEFAULT_COUNTRY_CODE,
): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  let normalized = digits;

  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2);
  }

  if (normalized.length <= 8 && defaultCountryCode) {
    normalized = `${defaultCountryCode}${normalized}`;
  }

  if (normalized.length < 10 || normalized.length > 15) {
    return null;
  }

  return normalized;
}

export function formatWhatsAppPhoneForDisplay(phone: string) {
  return phone.startsWith("+") ? phone : `+${phone}`;
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string) {
  const encodedMessage = encodeURIComponent(message);
  if (phone) {
    return `https://wa.me/${phone}?text=${encodedMessage}`;
  }

  return `https://wa.me/?text=${encodedMessage}`;
}

export function parseInviteWhatsappPhones(raw: string | undefined) {
  if (!raw?.trim()) {
    return [];
  }

  return raw.split(/[\n,;]+/).map((phone) => phone.trim());
}

export function whatsappPhoneAtIndex(phones: string[], index: number) {
  const raw = phones[index];
  if (!raw) {
    return null;
  }

  return normalizeWhatsAppPhone(raw);
}
