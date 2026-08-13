import type { DashboardLayoutItem } from './types';

const PREFIX = 'duncit.dashboard.layout.';

/**
 * The layout the server holds, mirrored locally so the grid paints in its saved
 * shape on the first frame instead of flashing the default arrangement while
 * `myDashboardLayout` is in flight.
 *
 * Not namespaced by user id on purpose: `clearAllStorages()` empties
 * localStorage on logout, so the next person to sign in on this browser cannot
 * inherit the previous one's arrangement.
 */
const keyFor = (dashboardId: string) => `${PREFIX}${dashboardId}`;

function isItem(value: unknown): value is DashboardLayoutItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.x === 'number' &&
    typeof item.y === 'number' &&
    typeof item.w === 'number' &&
    typeof item.h === 'number'
  );
}

/** The cached layout, or null when there is none or it is unreadable. */
export function readCachedLayout(dashboardId: string): DashboardLayoutItem[] | null {
  try {
    const raw = globalThis.localStorage?.getItem(keyFor(dashboardId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const items = parsed.filter(isItem);
    return items.length ? items : null;
  } catch {
    return null;
  }
}

export function writeCachedLayout(dashboardId: string, items: readonly DashboardLayoutItem[]): void {
  try {
    globalThis.localStorage?.setItem(keyFor(dashboardId), JSON.stringify(items));
  } catch {
    /* private mode / quota — the server copy is still authoritative */
  }
}

export function clearCachedLayout(dashboardId: string): void {
  try {
    globalThis.localStorage?.removeItem(keyFor(dashboardId));
  } catch {
    /* ignore */
  }
}
