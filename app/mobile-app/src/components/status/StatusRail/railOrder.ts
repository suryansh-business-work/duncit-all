import type { StatusGroup } from '@/hooks/useStatus';

/** True once every slide in the group has been seen (server flag or this
 * session's views) — sends the tile to the end of the rail and drops its ring. */
export function isGroupSeen(group: StatusGroup, seenIds: Set<string>) {
  return group.slides.length > 0 && group.slides.every((s) => s.seenByMe || seenIds.has(s.id));
}

/** Fisher–Yates shuffle returning a fresh copy — randomises the unseen tiles on
 * every data load (refresh / app open) so the rail order feels alive. */
export function shuffleStatus<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = swap;
  }
  return copy;
}
