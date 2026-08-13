import { useEffect, useRef, type RefObject } from 'react';
import { GridStack, type GridStackWidget } from 'gridstack';
import { BREAKPOINTS, CELL_HEIGHT, GRID_COLUMNS, layoutsEqual, serialiseNodes } from './layout';
import type { DashboardLayoutItem } from './types';

/** The handle class the widget header puts on its grip — dragging starts there only. */
export const DRAG_HANDLE_CLASS = 'duncit-dashboard-drag';

export interface UseGridStackOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  /** The slots to render. The grid does not initialise until this is non-null. */
  layout: DashboardLayoutItem[] | null;
  /** Drag and resize are off until the user opts into editing. */
  editing: boolean;
  /** Changes when the widget SET changes, forcing a rebuild of the grid. */
  widgetsKey: string;
  cellHeight?: number;
  /**
   * Ids of `fitContent` widgets. Their on-grid `h` is measured from content,
   * so layout comparisons must not treat it as user state.
   */
  autoHeightIds?: ReadonlySet<string>;
  /** Called after every user-driven move or resize. */
  onChange: (items: DashboardLayoutItem[]) => void;
}

export interface GridStackHandle {
  /** Current slots straight off the grid. */
  read: () => DashboardLayoutItem[];
  /** Move every widget to the given slots (used by Reset). */
  apply: (items: readonly DashboardLayoutItem[]) => void;
}

/**
 * The current slots, ALWAYS in twelve-column terms.
 *
 * `save()` with no `column` argument returns the largest cached layout rather
 * than the one on screen, which is the whole point: someone rearranging on a
 * 900px window is working in six columns, and storing those numbers would
 * squeeze the dashboard into the left half of a full-width screen next time.
 * Do not "fix" this by passing `grid.getColumn()`.
 */
const readGrid = (grid: GridStack): DashboardLayoutItem[] =>
  serialiseNodes(grid.save(false) as GridStackWidget[]);

/**
 * Move every widget to the given slots.
 *
 * `load` rather than a loop of `update` calls: it is the documented inverse of
 * `save`, and it is the one that copes with pushing a twelve-column layout into
 * a grid currently rendering at six or one — it caches the wide layout instead
 * of clamping every widget to the narrow column count. `addRemove: false`
 * because React owns the item elements; GridStack must only move them.
 */
function applyLayout(grid: GridStack, items: readonly DashboardLayoutItem[]): void {
  grid.load(
    items.map((item) => ({ id: item.id, x: item.x, y: item.y, w: item.w, h: item.h })),
    false
  );
}

/**
 * Owns the GridStack instance behind a dashboard.
 *
 * GridStack writes positions as inline styles on the item elements while React
 * owns their contents. That only stays stable because React never re-keys or
 * reorders the items: the element list is rebuilt (grid destroyed and
 * re-initialised) solely when `widgetsKey` says the widget set itself changed.
 * Everything else — a layout arriving from the server, a Reset — is pushed
 * through `apply`, so React and GridStack never write the same property.
 */
export function useGridStack({
  containerRef,
  layout,
  editing,
  widgetsKey,
  cellHeight = CELL_HEIGHT,
  autoHeightIds,
  onChange,
}: UseGridStackOptions): GridStackHandle {
  const gridRef = useRef<GridStack | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Set while we move widgets ourselves, so a programmatic layout does not read
  // back as the user having rearranged the dashboard.
  const applyingRef = useRef(false);

  const ready = !!layout;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !ready) return undefined;

    const grid = GridStack.init(
      {
        column: GRID_COLUMNS,
        columnOpts: { breakpointForWindow: true, breakpoints: [...BREAKPOINTS] },
        cellHeight,
        margin: 8,
        float: false,
        animate: true,
        handle: `.${DRAG_HANDLE_CLASS}`,
        // Corners plus the bottom and side edges — the default is the one
        // south-east corner, which makes resizing feel broken.
        resizable: { handles: 'e,se,s,sw,w' },
        // Handles only exist while editing, so "always" means "while editing".
        // The default ('mobile') auto-hides them behind display:none until the
        // pointer is already over the item — invisible affordances read as
        // "resize is broken".
        alwaysShowResizeHandle: true,
        // Editing is opt-in; the effect below turns it on with the toolbar.
        staticGrid: true,
      },
      el
    );
    // `init` answers null only when the element is already a grid, which cannot
    // happen here — the effect owns this element's whole lifecycle.
    if (!grid) return undefined;
    gridRef.current = grid;

    grid.on('change', () => {
      if (applyingRef.current) return;
      // While static (not editing) the only movers are programmatic — a
      // fitContent widget re-measuring, a breakpoint collapse. Not user edits.
      if (grid.opts.staticGrid) return;
      onChangeRef.current(readGrid(grid));
    });

    // GridStack watches only the grid's WIDTH — it never observes item
    // content. Without this, a fitContent card keeps its loading-state height
    // after its query lands, until the next window resize. Observing the card
    // (which is natural-height) cannot loop: resizeToContent changes the slot
    // around the card, not the card itself.
    let contentObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      contentObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const item = entry.target.closest('.grid-stack-item');
          if (item instanceof HTMLElement) grid.resizeToContent(item);
        }
      });
      for (const card of el.querySelectorAll(
        '.grid-stack-item[gs-size-to-content] > .grid-stack-item-content > :first-child'
      )) {
        contentObserver.observe(card);
      }
    }

    return () => {
      contentObserver?.disconnect();
      grid.offAll();
      // `false` keeps the DOM: React owns those nodes and will unmount them.
      grid.destroy(false);
      gridRef.current = null;
    };
  }, [containerRef, ready, widgetsKey, cellHeight]);

  useEffect(() => {
    gridRef.current?.setStatic(!editing);
  }, [editing, ready, widgetsKey]);

  // A layout that arrives after mount (the server's copy replacing the cached
  // one, or a Reset) is pushed onto the live grid rather than re-rendered.
  // fitContent heights are compared as "equal" — the grid's h for those is a
  // measurement, and re-applying the stored h would only make GridStack snap it
  // straight back, pulsing the page on every Apollo response.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !layout) return;
    if (layoutsEqual(readGrid(grid), layout, autoHeightIds)) return;

    applyingRef.current = true;
    applyLayout(grid, layout);
    applyingRef.current = false;
  }, [layout, autoHeightIds]);

  const handleRef = useRef<GridStackHandle>({
    read: () => (gridRef.current ? readGrid(gridRef.current) : []),
    apply: (items) => {
      const grid = gridRef.current;
      if (!grid) return;
      applyingRef.current = true;
      applyLayout(grid, items);
      applyingRef.current = false;
    },
  });

  return handleRef.current;
}
