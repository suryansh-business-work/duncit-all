/**
 * @duncit/dashboard — the draggable dashboard every Duncit console renders.
 *
 * A page declares WHAT it shows (an array of widgets, each with a default slot
 * and a minimum size) and this package owns WHERE: a responsive GridStack grid,
 * drag and resize behind an explicit edit mode, and a per-user layout stored
 * server-side so it follows the person between machines.
 */
export { DuncitDashboard, type DuncitDashboardProps } from './DuncitDashboard';
export { DashboardWidgetCard, type DashboardWidgetCardProps } from './DashboardWidgetCard';
export { DashboardToolbar, type DashboardToolbarProps } from './DashboardToolbar';
export { DashboardGrid, type DashboardGridProps } from './DashboardGrid';
export type { DashboardLayoutItem, DashboardPosition, DashboardWidget } from './types';

// The pure layout maths, exported so a portal can compute a default arrangement
// (or a test can assert one) without mounting a grid.
export {
  BREAKPOINTS,
  CELL_HEIGHT,
  GRID_COLUMNS,
  defaultLayout,
  layoutsEqual,
  normalisePosition,
  resolveLayout,
  serialiseNodes,
  type GridNodeLike,
} from './layout';

export { useDashboardLayout, type DashboardLayoutState } from './useDashboardLayout';
export {
  useDashboardController,
  type DashboardController,
  type DashboardControllerLabels,
} from './useDashboardController';
export { DRAG_HANDLE_CLASS } from './useGridStack';
export {
  MY_DASHBOARD_LAYOUT,
  RESET_DASHBOARD_LAYOUT,
  SAVE_DASHBOARD_LAYOUT,
  type DashboardLayoutDto,
  type DashboardLayoutItemDto,
} from './queries';
export { DASHBOARD_FALLBACK_FLAT } from './i18n';
