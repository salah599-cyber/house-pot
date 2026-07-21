export function parseGuestNames(raw: string | undefined): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const part of (raw ?? "").split(/[\n,;]+/)) {
    const name = part.trim();
    if (!name) {
      continue;
    }

    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    names.push(name);
  }

  return names;
}

export function validateGuestName(name: string): string | null {
  if (name.length < 2) {
    return `"${name}" must be at least 2 characters.`;
  }

  if (name.length > 60) {
    return `"${name}" must be at most 60 characters.`;
  }

  return null;
}
