/**
 * Resolve stored profile/cabinet image values to browser URLs.
 * @param {string | null | undefined} stored
 * @returns {string | null}
 */
export function resolveProfileImageUrl(stored) {
  const v = String(stored ?? "").trim();
  if (!v) return null;
  if (v.startsWith("data:") || v.startsWith("http")) return v;
  if (isProbablyBase64(v)) {
    return `data:image/jpeg;base64,${v.replace(/\s/g, "")}`;
  }

  const path = v.startsWith("/") ? v : `/${v}`;
  if (path.startsWith("/api/v1/media/profile/")) return path;
  if (path.startsWith("/data/profile/")) {
    const name = path.split("/").pop() ?? "";
    return name ? `/api/v1/media/profile/${encodeURIComponent(name)}` : null;
  }
  if (path.startsWith("/uploads/profile/")) {
    const name = path.split("/").pop() ?? "";
    const mobileBase = (
      import.meta.env.VITE_API_FALLBACK_URL || "https://api.example.com"
    ).replace(/\/$/, "");
    return `${mobileBase}/uploads/profile/${encodeURIComponent(name)}`;
  }

  const mobileBase = (
    import.meta.env.VITE_API_FALLBACK_URL || "https://api.example.com"
  ).replace(/\/$/, "");
  if (path.startsWith("/uploads/")) return `${mobileBase}${path}`;

  return null;
}

function isProbablyBase64(value) {
  if (!value || value.includes("/")) return false;
  return value.length > 80 && /^[A-Za-z0-9+/=\r\n]+$/.test(value.slice(0, 256));
}

/**
 * @param {string} name
 * @returns {string}
 */
export function profileInitials(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return "?";
}
