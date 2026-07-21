import type { FastifyReply } from "fastify";

export function parseOptionalInt(raw: string | undefined): number | undefined {
  if (raw == null || String(raw).trim() === "") return undefined;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function requireNonEmptyParam(
  raw: string | undefined,
  fieldName: string,
  reply: FastifyReply
): string | null {
  const value = String(raw ?? "").trim();
  if (!value) {
    reply.status(400).send({ error: `${fieldName} is required` });
    return null;
  }
  return value;
}

export function requireObjectBody(
  body: unknown,
  reply: FastifyReply
): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    reply.status(400).send({ error: "Body must be a JSON object" });
    return null;
  }
  return body as Record<string, unknown>;
}
