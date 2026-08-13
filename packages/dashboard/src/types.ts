import type { ReactNode } from 'react';

/** A slot on the grid, in GridStack column/row units. */
export interface DashboardPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A slot plus the widget that occupies it — the shape that is stored. */
export interface DashboardLayoutItem extends DashboardPosition {
  id: string;
}

/**
 * One panel of a dashboard.
 *
 * A dashboard is declared as an array of these, in the order it reads top to
 * bottom by default. `id` is what a saved layout refers to, so it must stay
 * stable across releases — renaming one silently returns that widget to its
 * default slot for everybody who had moved it.
 */
export interface DashboardWidget {
  /** Stable, unique within the dashboard. Never derived from an index. */
  id: string;
  /** Header title. Omit together with `subtitle` for a header-less widget. */
  title?: string;
  subtitle?: string;
  /** Header right-hand slot — a filter, a "View all" button, a menu. */
  headerActions?: ReactNode;
  /** The widget body. */
  content: ReactNode;
  /** Where the widget sits before the user moves it. */
  defaultLayout: DashboardPosition;
  /** Smallest the user may drag it — defaults to `defaultLayout`'s own size. */
  minW?: number;
  minH?: number;
  /**
   * Render the body edge-to-edge (no card padding) — for tables and charts
   * that bring their own insets.
   */
  disablePadding?: boolean;
  /**
   * Drop the Card chrome entirely: no surface, no header, no border. For a
   * section that is already a run of cards of its own (a KPI strip).
   */
  bare?: boolean;
  /**
   * The widget's height follows its content instead of a fixed row count
   * (GridStack `sizeToContent`). For content whose natural height the page
   * cannot know up front — a KPI strip that wraps with the viewport, a chart
   * block — so it is never cut off and never leaves dead space. The user can
   * still drag it and resize its width; its height re-snaps to the content.
   * Leave unset for bodies that fill whatever height they are given (tables,
   * lists) — those need a fixed `h` to size against, and auto would collapse
   * them to their minimum.
   */
  fitContent?: boolean;
}
