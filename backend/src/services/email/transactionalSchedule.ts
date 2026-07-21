/**
 * Fire-and-forget wrapper for transactional send tasks.
 */
import { logger } from "../../logger.js";

export function scheduleTransactionalEmail(
  kind: string,
  caseId: number | undefined,
  fn: () => Promise<void>
): void {
  void fn().catch((err: unknown) => {
    logger.error(
      { err, emailKind: kind, caseId },
      "Transactional email task failed"
    );
  });
}
