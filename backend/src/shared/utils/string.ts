export function ns(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "" || s.toLowerCase() === "null") return null;
  return s;
}
