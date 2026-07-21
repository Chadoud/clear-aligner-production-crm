import { logger } from "../../logger.js";

export type MutationAction =
  | "create"
  | "update"
  | "delete"
  | "accept"
  | "transition";

export type MutationResource =
  | "invoice"
  | "case"
  | "stripping"
  | "patient"
  | "case_doc"
  | "suivi"
  | "user_note";

export interface MutationLogPayload {
  correlationId: string | undefined;
  action: MutationAction;
  resource: MutationResource;
  resourceId?: number | string | null;
  userId?: number | null;
  cabinetId?: number | null;
  extra?: Record<string, unknown>;
}

/**
 * Structured log for write operations that mutate state.
 * Always emitted at INFO level so they appear in production logs.
 */
export function logMutation(payload: MutationLogPayload): void {
  const {
    correlationId,
    action,
    resource,
    resourceId,
    userId,
    cabinetId,
    extra,
  } = payload;
  logger.info(
    {
      correlationId,
      action,
      resource,
      resourceId: resourceId ?? undefined,
      userId: userId ?? undefined,
      cabinetId: cabinetId ?? undefined,
      ...extra,
    },
    `${resource}.${action}`
  );
}
