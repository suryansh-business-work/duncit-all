/** Which way a row moves in a hand-ordered list. */
export type MoveDirection = -1 | 1;

/**
 * The ids in their new order after moving `id` one place up (-1) or down (1).
 * Answers `null` when the move would fall off either end, so the caller sends
 * nothing to the server.
 */
export function moveId(ids: readonly string[], id: string, direction: MoveDirection): string[] | null {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}
