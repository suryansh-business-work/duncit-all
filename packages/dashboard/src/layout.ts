import type { DashboardLayoutItem, DashboardPosition, DashboardWidget } from './types';

/** The grid is twelve columns wide at every breakpoint above the phone one. */
export const GRID_COLUMNS = 12;

/** A row is this tall in px; a widget's `h` is a multiple of it. */
export const CELL_HEIGHT = 76;

/**
 * Column counts by the GRID's own width, not the window's: the sidebar and the
 * Agent dock take a different share of every window, so a window breakpoint
 * crammed twelve columns into a laptop's leftover pane. At or below 600px the
 * grid is one stacked column (a phone), at or below 900px six (a tablet, a
 * narrow pane), and above that the full twelve.
 */
export const BREAKPOINTS: ReadonlyArray<{ w: number; c: number }> = [
  { w: 600, c: 1 },
  { w: 900, c: 6 },
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
    if (other?.x !== item.x || other.y !== item.y || other.w !== item.w) return false;
    return other.h === item.h || !!ignoreHeightFor?.has(item.id);
  });
}

/**
 * The moves the Arrange menu offers — the way to lay a dashboard out without
 * dragging (WCAG 2.5.7 Dragging Movements, 2.1.1 Keyboard). Earlier / later
 * walk the reading order; the rest grow or shrink the widget one cell.
 */
export const ARRANGE_ACTIONS = ['earlier', 'later', 'wider', 'narrower', 'taller', 'shorter'] as const;

export type ArrangeAction = (typeof ARRANGE_ACTIONS)[number];

/** The smallest a widget may be made — its own minimum, else its declared size capped at 3×2. */
export function minSizeOf(widget: DashboardWidget): { w: number; h: number } {
  const size = normalisePosition(widget.defaultLayout);
  return { w: widget.minW ?? Math.min(size.w, 3), h: widget.minH ?? Math.min(size.h, 2) };
}

/**
 * A widget's minimum width on a grid that is currently `column` columns wide.
 *
 * `minW` is declared in twelve-column terms, but GridStack reads it as an
 * absolute column count — handed over as-is, a "at least a third" minimum of 4
 * would force a half-width tablet slot (3 of 6) up to two thirds.
 */
export function minWidthFor(minW: number, column: number): number {
  return Math.min(column, Math.max(1, Math.ceil((minW * column) / GRID_COLUMNS)));
}

/** Top to bottom, then left to right — the order a sighted reader meets the widgets. */
const byReadingOrder = (a: DashboardPosition, b: DashboardPosition): number => a.y - b.y || a.x - b.x;

/**
 * A twelve-column layout re-flowed for a grid `column` columns wide, in the
 * order it reads on a wide screen. Returned in that reading order, each input
 * paired with its new slot.
 *
 * Scaling every widget by the column ratio (GridStack's default) keeps the wide
 * proportions, which is what a narrow grid cannot afford: four quarter-width
 * tiles round to widths that no longer share a row and wrap three-and-one.
 * Instead a widget half the row wide or narrower takes half the row, and a
 * wider one the whole row — a tablet reads as tidy pairs, a phone as a single
 * column. At twelve columns nothing moves.
 */
export function reflowLayout<T extends DashboardPosition>(
  items: readonly T[],
  column: number
): Array<{ item: T; slot: DashboardPosition }> {
  const ordered = [...items].sort(byReadingOrder);
  if (column >= GRID_COLUMNS) {
    return ordered.map((item) => ({ item, slot: { x: item.x, y: item.y, w: item.w, h: item.h } }));
  }

  const half = Math.max(1, Math.floor(column / 2));
  let x = 0;
  let rowTop = 0;
  let rowBottom = 0;
  return ordered.map((item) => {
    const w = item.w * 2 > GRID_COLUMNS ? column : half;
    if (x + w > column) {
      x = 0;
      rowTop = rowBottom;
    }
    const slot = { x, y: rowTop, w, h: item.h };
    rowBottom = Math.max(rowBottom, rowTop + item.h);
    x += w;
    return { item, slot };
  });
}

/** The widget trades places with its neighbour in reading order, each keeping its own size. */
function swapWithNeighbour(
  items: readonly DashboardLayoutItem[],
  id: string,
  step: 1 | -1
): DashboardLayoutItem[] {
  const ordered = [...items].sort(byReadingOrder);
  const index = ordered.findIndex((item) => item.id === id);
  const target = ordered[index];
  const neighbour = ordered[index + step];
  if (!target || !neighbour) return [...items];
  const moveTo = (item: DashboardLayoutItem, to: DashboardLayoutItem): DashboardLayoutItem => ({
    id: item.id,
    ...normalisePosition({ x: to.x, y: to.y, w: item.w, h: item.h }),
  });
  return items.map((item) => {
    if (item.id === target.id) return moveTo(item, neighbour);
    if (item.id === neighbour.id) return moveTo(item, target);
    return item;
  });
}

/** One cell of growth per resize move; the minimum clamps the shrinking ones. */
const RESIZE_STEP: Readonly<Record<Exclude<ArrangeAction, 'earlier' | 'later'>, { w: number; h: number }>> = {
  wider: { w: 1, h: 0 },
  narrower: { w: -1, h: 0 },
  taller: { w: 0, h: 1 },
  shorter: { w: 0, h: -1 },
};

/**
 * The layout after one Arrange move. The result may overlap — the grid pushes
 * and packs widgets as it applies it, exactly as it does after a drag.
 */
export function arrangeLayout(
  items: readonly DashboardLayoutItem[],
  id: string,
  action: ArrangeAction,
  min: { w: number; h: number }
): DashboardLayoutItem[] {
  if (action === 'earlier') return swapWithNeighbour(items, id, -1);
  if (action === 'later') return swapWithNeighbour(items, id, 1);
  const step = RESIZE_STEP[action];
  return items.map((item) => {
    if (item.id !== id) return item;
    const w = Math.max(min.w, item.w + step.w);
    const h = Math.max(min.h, item.h + step.h);
    return { id, ...normalisePosition({ x: item.x, y: item.y, w, h }) };
  });
}

/**
 * The moves that would change something for this widget right now — the rest
 * are shown disabled. A content-sized widget's height is measured, not chosen,
 * so it never offers taller / shorter.
 */
export function availableArrangeActions(
  items: readonly DashboardLayoutItem[],
  widget: DashboardWidget
): ArrangeAction[] {
  const min = minSizeOf(widget);
  return ARRANGE_ACTIONS.filter((action) => {
    if (widget.fitContent && (action === 'taller' || action === 'shorter')) return false;
    return !layoutsEqual(arrangeLayout(items, widget.id, action, min), items);
  });
}
