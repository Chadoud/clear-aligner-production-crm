type LogLevel = "debug" | "info" | "warn" | "error";
import { appLogLevel } from "@/config/env";

const logPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel: LogLevel = appLogLevel;

const shouldLog = (level: LogLevel) =>
  logPriority[level] >= logPriority[currentLevel];

const formatPayload = (message: string, meta?: unknown) => ({
  timestamp: new Date().toISOString(),
  message,
  meta,
});

export const logger = {
  debug(message: string, meta?: unknown) {
    if (shouldLog("debug")) console.debug(formatPayload(message, meta));
  },
  info(message: string, meta?: unknown) {
    if (shouldLog("info")) console.info(formatPayload(message, meta));
  },
  warn(message: string, meta?: unknown) {
    if (shouldLog("warn")) console.warn(formatPayload(message, meta));
  },
  error(message: string, meta?: unknown) {
    if (shouldLog("error")) console.error(formatPayload(message, meta));
  },
};
