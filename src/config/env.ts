export type AppLogLevel = "debug" | "info" | "warn" | "error";

function parseEnvBoolean(raw: unknown, fallback = false): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw !== "string") return fallback;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseLogLevel(raw: unknown, fallback: AppLogLevel): AppLogLevel {
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return fallback;
}

export const isDev = import.meta.env.DEV;
export const isApiEnabled = parseEnvBoolean(
  import.meta.env.VITE_USE_API,
  false
);
export const appLogLevel = parseLogLevel(
  import.meta.env.VITE_LOG_LEVEL,
  "info"
);

if (!isDev && !isApiEnabled) {
  console.warn(
    "[env] VITE_USE_API is disabled in a non-dev build. This mode is intended for local development only."
  );
}
