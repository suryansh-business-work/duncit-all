/** The most rows one page of either contacts list may carry. */
const MAX_PAGE = 500;

/** One page of a contacts list: its rows, and how many the whole list holds. */
export interface ContactsPage<T> {
  total: number;
  rows: T[];
}

/**
 * The window one page asks for, clamped — a client never sizes a query
 * unbounded, and a missing limit means the largest page rather than all of it.
 */
export function pageWindow(offset?: number | null, limit?: number | null) {
  return {
    skip: Math.max(0, Math.trunc(offset ?? 0)),
    take: Math.min(MAX_PAGE, Math.max(1, Math.trunc(limit ?? MAX_PAGE))),
  };
}
