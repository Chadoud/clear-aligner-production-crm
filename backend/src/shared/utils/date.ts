export function formatDate(d: Date | null | undefined): string {
  if (!d) return "Empty";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export function formatTs(d: Date | null | undefined): string {
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()} ${hh}:${mm}`;
}

export function mysqlDate(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v);
  if (s.startsWith("0000")) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
