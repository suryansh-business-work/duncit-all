import { useEffect, useRef, type RefObject } from 'react';
import {
  GridStack,
  type GridItemHTMLElement,
  type GridStackNode,
  type GridStackWidget,
  type Responsive,
} from 'gridstack';
import {
  BREAKPOINTS,
  CELL_HEIGHT,
  GRID_COLUMNS,
  layoutsEqual,
  minWidthFor,
  reflowLayout,
  serialiseNodes,
} from './layout';
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
 * GridStack's hook for a column change: re-flow the widgets it hands over
 * (see `reflowLayout`) and hand them back placed.
 */
function reflowNodes(column: number, _previous: number, placed: GridStackNode[], pending: GridStackNode[]): void {
  const positions = pending.map((node) => ({
    node,
    x: node.x ?? 0,
    y: node.y ?? 0,
    w: node.w ?? 1,
    h: node.h ?? 1,
  }));
  for (const { item, slot } of reflowLayout(positions, column)) {
    item.node.x = slot.x;
    item.node.y = slot.y;
    item.node.w = slot.w;
    placed.push(item.node);
  }
}

/** Breakpoints by the grid's own width, widest first — the order GridStack walks them. */
const responsiveColumns = (): Responsive => ({
  breakpointForWindow: false,
  // Without it GridStack answers "undefined" above the widest breakpoint and
  // never climbs back to twelve once the grid has been narrowed.
  columnMax: GRID_COLUMNS,
  breakpoints: [...BREAKPOINTS].sort((a, b) => b.w - a.w),
  layout: reflowNodes,
});

/**
 * Move every widget to the given slots.
 *
 * `load` rather than a loop of `update` calls: it is the documented inverse of
 * `save`. Stored slots are twelve-column, and loaded into a narrower grid
 * GridStack clamps each one rather than re-flowing them, so the load happens
 * at twelve and the grid then steps back down through the same re-flow a
 * resize uses. `addRemove: false` because React owns the item elements;
 * GridStack must only move them.
 */
function applyLayout(grid: GridStack, items: readonly DashboardLayoutItem[]): void {
  const column = grid.getColumn();
  if (column !== GRID_COLUMNS) grid.column(GRID_COLUMNS, 'none');
  grid.load(
    items.map((item) => ({ id: item.id, x: item.x, y: item.y, w: item.w, h: item.h })),
    false
  );
  if (column !== GRID_COLUMNS) grid.column(column, reflowNodes);
}

/**
 * Minimum widths live on the item as `data-min-w` (twelve-column terms), not
 * as `gs-min-w`: GridStack enforces a node's minW on every column change too,
 * which would force a re-flowed half-width slot wider. So the minimum is only
 * handed to GridStack for the length of a resize, scaled to the grid's current
 * column count.
 */
function holdMinWidth(grid: GridStack, el: GridItemHTMLElement): void {
  const node = el.gridstackNode;
  if (node) node.minW = minWidthFor(Number(el.dataset.minW) || 1, grid.getColumn());
}

function releaseMinWidth(el: GridItemHTMLElement): void {
  if (el.gridstackNode) delete el.gridstackNode.minW;
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
        cellHeight,
        margin: 8,
        float: false,
        // Turned on below, once the responsive re-flow is committed to style.
        animate: false,
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

    // Built at twelve columns first, so every widget lands exactly on its
    // stored slot and GridStack caches that full layout; only then made
    // responsive. Given the breakpoints up front, a phone would place each
    // widget by clamping its twelve-column slot, and nothing would remember the
    // wide arrangement that Save has to write back.
    grid.updateOptions({ columnOpts: responsiveColumns() });
    // Commit the re-flowed positions to style before animation comes on, or
    // the first paint would fly every widget in from its twelve-column slot.
    el.getBoundingClientRect();
    grid.setAnimation(true);

    grid.on('change', () => {
      if (applyingRef.current) return;
      // While static (not editing) the only movers are programmatic — a
      // fitContent widget re-measuring, a breakpoint collapse. Not user edits.
      if (grid.opts.staticGrid) return;
      // GridStack raises the same event for its own moves (auto-sizing, column
      // changes) and flags them — without this a fitContent re-measure that
      // pushes neighbours down would light up Save with no user edit.
      if (grid.isIgnoreChangeCB()) return;
      onChangeRef.current(readGrid(grid));
    });

    // GridStack watches only the grid's WIDTH — it never observes item
    // content. Without this, a fitContent card keeps its loading-state height
    // after its query lands, until the next window resize. Observing the card
    // (which is natural-height) cannot loop: resizeToContent changes the slot
    // around the card, not the card itself.
    //
    // Never resize mid-gesture: resizeToContent's beginUpdate would overwrite
    // the engine's pre-drag snapshot, breaking Esc-cancel and the drop's
    // change detection (the guard upstream added for #2823 does not cover this
    // path). A growth that lands during a drag is applied after the drop.
    let contentObserver: ResizeObserver | undefined;
    let disposed = false;
    let gestureActive = false;
    const pendingFits = new Set<HTMLElement>();
    const beginGesture = () => {
      gestureActive = true;
    };
    const endGesture = () => {
      gestureActive = false;
      // Next macrotask, so GridStack has fully settled the gesture first.
      globalThis.setTimeout(() => {
        if (disposed) return;
        for (const item of pendingFits) grid.resizeToContent(item);
        pendingFits.clear();
      }, 0);
    };
    grid.on('dragstart', beginGesture);
    grid.on('resizestart', (_event, item) => {
      holdMinWidth(grid, item);
      beginGesture();
    });
    grid.on('dragstop', endGesture);
    grid.on('resizestop', (_event, item) => {
      releaseMinWidth(item);
      endGesture();
    });
    if (typeof ResizeObserver !== 'undefined') {
      contentObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const item = entry.target.closest('.grid-stack-item');
          if (!(item instanceof HTMLElement)) continue;
          if (gestureActive) {
            pendingFits.add(item);
          } else {
            grid.resizeToContent(item);
          }
        }
      });
      for (const card of el.querySelectorAll(
        '.grid-stack-item[gs-size-to-content] > .grid-stack-item-content > :first-child'
      )) {
        contentObserver.observe(card);
      }
    }

    return () => {
      disposed = true;
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
