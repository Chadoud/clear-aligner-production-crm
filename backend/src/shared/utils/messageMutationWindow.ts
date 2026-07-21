/** Own-message edit/delete allowed within this window after send. */
export const MESSAGE_MUTATION_WINDOW_MS = 5 * 60 * 1000;

export function isWithinMutationWindow(
  createdAt: string | Date | null | undefined,
  nowMs = Date.now()
): boolean {
  if (createdAt == null || createdAt === "") return false;
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  return nowMs - createdMs <= MESSAGE_MUTATION_WINDOW_MS;
}
