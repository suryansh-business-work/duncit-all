import type { DashboardLayoutItem, DashboardPosition, DashboardWidget } from './types';

/** The grid is twelve columns wide at every breakpoint above the phone one. */
export const GRID_COLUMNS = 12;

/** A row is this tall in px; a widget's `h` is a multiple of it. */
export const CELL_HEIGHT = 76;

/**
 * Below this window width the grid collapses to a single column, so a widget's
 * `w` stops mattering and everything stacks in `y` order. Above the second, the
 * full twelve columns apply.
 */
export const BREAKPOINTS: ReadonlyArray<{ w: number; c: number }> = [
  { w: 700, c: 1 },
  { w: 1100, c: 6 },
];

const clampInt = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), max);
};

/** Force a position inside the grid: at least one cell, never past column 12. */
export function normalisePosition(pos: DashboardPosition): DashboardPosition {
  const w = clampInt(pos.w, 1, GRID_COLUMNS);
  return {
    w,
    h: Math.max(1, clampInt(pos.h, 1, Number.MAX_SAFE_INTEGER)),
    x: clampInt(pos.x, 0, GRID_COLUMNS - w),
    y: Math.max(0, clampInt(pos.y, 0, Number.MAX_SAFE_INTEGER)),
  };
}

/** Every widget in its declared slot — what Reset restores. */
export function defaultLayout(widgets: readonly DashboardWidget[]): DashboardLayoutItem[] {
  return widgets.map((widget) => ({ id: widget.id, ...normalisePosition(widget.defaultLayout) }));
}

/** The first free row under everything placed so far. */
function bottomOf(items: readonly DashboardLayoutItem[]): number {
  return items.reduce((lowest, item) => Math.max(lowest, item.y + item.h), 0);
}

/**
 * The layout actually rendered: the user's saved slots where they still apply,
 * declared defaults everywhere else.
 *
 * Two drifts have to survive a release. A widget the build no longer defines is
 * dropped — its stored slot refers to nothing. A widget shipped SINCE the save
 * has no stored slot, and taking its default would drop it on top of a widget
 * the user deliberately moved there, so it is appended below the saved ones
 * instead, keeping only its size.
 */
export function resolveLayout(
  widgets: readonly DashboardWidget[],
  saved: readonly DashboardLayoutItem[] | null | undefined
): DashboardLayoutItem[] {
  if (!saved?.length) return defaultLayout(widgets);

  const savedById = new Map(saved.map((item) => [item.id, item]));
  const placed: DashboardLayoutItem[] = [];
  const missing: DashboardWidget[] = [];

  for (const widget of widgets) {
    const stored = savedById.get(widget.id);
    if (stored) {
      placed.push({ id: widget.id, ...normalisePosition(stored) });
    } else {
      missing.push(widget);
    }
  }

  let nextRow = bottomOf(placed);
  for (const widget of missing) {
    const size = normalisePosition(widget.defaultLayout);
    placed.push({ id: widget.id, x: size.x, y: nextRow, w: size.w, h: size.h });
    nextRow += size.h;
  }

  return placed;
}

/** A GridStack node, as far as this package needs to read one. */
export interface GridNodeLike {
  id?: string | number | null;
  x?: number | null;
  y?: number | null;
  w?: number | null;
  h?: number | null;
}

/**
 * Turn what `grid.save()` hands back into storable items. Nodes without an id
 * cannot be matched to a widget on read, so they are dropped rather than
 * written under an empty key.
 */
export function serialiseNodes(nodes: readonly GridNodeLike[]): DashboardLayoutItem[] {
  const items: DashboardLayoutItem[] = [];
  for (const node of nodes) {
    const id = node.id == null ? '' : String(node.id);
    if (!id) continue;
    items.push({
      id,
      ...normalisePosition({ x: node.x ?? 0, y: node.y ?? 0, w: node.w ?? 1, h: node.h ?? 1 }),
    });
  }
  return items;
}

/**
 * Same widgets in the same slots — used to know whether Save has anything to do.
 *
 * `ignoreHeightFor` names the `fitContent` widgets: their `h` on the live grid
 * is whatever the content measured, not what the layout stored, so comparing it
 * would report every stored layout as "different" and push it onto a grid that
 * is already arranged correctly.
 */
export function layoutsEqual(
  a: readonly DashboardLayoutItem[],
  b: readonly DashboardLayoutItem[],
  ignoreHeightFor?: ReadonlySet<string>
): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((item) => [item.id, item]));
  return a.every((item) => {
    const other = byId.get(item.id);
    if (!other || other.x !== item.x || other.y !== item.y || other.w !== item.w) return false;
    return other.h === item.h || !!ignoreHeightFor?.has(item.id);
  });
}
