import { logger } from "@/core/logging/logger";

export const markPerformance = (name: string) => {
  performance.mark(name);
};

export const measurePerformance = (
  startMark: string,
  endMark: string,
  measureName: string
) => {
  try {
    performance.measure(measureName, startMark, endMark);
    const entry = performance.getEntriesByName(measureName).at(-1);
    if (entry) {
      logger.info("Performance measure", {
        name: measureName,
        duration: entry.duration,
      });
    }
  } catch {
    // no-op for unsupported browsers
  }
};
