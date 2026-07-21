export function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  const str =
    typeof raw === "string"
      ? raw
      : Buffer.isBuffer(raw)
        ? raw.toString("utf8")
        : String(raw);
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonArray(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v)).filter((s) => s.length > 0);
  }
  const parsed = safeJsonParse<unknown>(raw, null);
  return Array.isArray(parsed)
    ? parsed.map((v) => String(v)).filter((s) => s.length > 0)
    : [];
}

export function safeJsonStringify(raw: unknown, fallback = "[]"): string {
  if (raw == null) return fallback;
  if (Buffer.isBuffer(raw)) {
    const parsed = safeJsonParse<unknown>(raw, null);
    try {
      return JSON.stringify(parsed ?? JSON.parse(raw.toString("utf8")));
    } catch {
      return fallback;
    }
  }
  if (typeof raw === "string") {
    const parsed = safeJsonParse<unknown>(raw, null);
    if (parsed == null) return fallback;
    try {
      return JSON.stringify(parsed);
    } catch {
      return fallback;
    }
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return fallback;
  }
}
