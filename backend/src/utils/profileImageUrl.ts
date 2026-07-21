import { config } from "../config.js";

/** Older deployments sometimes stored raw base64 in `cabinet_logo`. */
export function isProbablyBase64Image(value: string): boolean {
  const v = value.trim();
  if (!v || v.includes("/") || v.startsWith("http") || v.startsWith("data:")) {
    return false;
  }
  return v.length > 80 && /^[A-Za-z0-9+/=\r\n]+$/.test(v.slice(0, 256));
}

/** Public URL for a CRM-hosted profile file stored on disk. */
export function crmProfileMediaUrl(filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  return `/api/v1/media/profile/${safe}`;
}

/** Stored DB value → browser-ready URL (relative or absolute). */
export function resolveStoredImageUrl(
  stored: string | null | undefined
): string | null {
  const v = String(stored ?? "").trim();
  if (!v) return null;
  if (v.startsWith("data:") || v.startsWith("http")) return v;
  if (isProbablyBase64Image(v)) {
    return v.startsWith("data:image")
      ? v
      : `data:image/jpeg;base64,${v.replace(/\s/g, "")}`;
  }

  const path = v.startsWith("/") ? v : `/${v}`;
  if (path.startsWith("/api/v1/media/profile/")) return path;
  if (path.startsWith("/data/profile/")) {
    const name = path.split("/").pop() ?? "";
    return name ? crmProfileMediaUrl(name) : null;
  }
  if (path.startsWith("/uploads/profile/")) {
    const name = path.split("/").pop() ?? "";
    const mobileBase = config.mobileApiBaseUrl.replace(/\/$/, "");
    return `${mobileBase}/uploads/profile/${encodeURIComponent(name)}`;
  }
  if (path.startsWith("/uploads/")) {
    const base = config.mobileApiBaseUrl.replace(/\/$/, "");
    return `${base}${path}`;
  }

  // Unknown relative paths — do not rewrite to an external docs host
  return null;
}

/** Canonical DB path after upload (shared with mobile API). */
export function storedPathForCrmProfileFile(filename: string): string {
  return `/uploads/profile/${filename}`;
}
