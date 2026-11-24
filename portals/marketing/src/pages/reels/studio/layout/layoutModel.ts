import type { ReelStudioPaneId, ReelStudioPaneMode } from '../../types';

/**
 * How the studio's four panes are arranged, as plain data and pure functions,
 * so the arrangement can be tested without a screen and saved as it stands.
 *
 * A pane is DOCKED in the split view, POPPED into a window of its own, or
 * CLOSED. Docked, it has a size — the footage and side panes a width, the
 * timeline a height; the player takes whatever is left. Popped, it has the
 * window's place and size. Sizes are kept within limits a person can still
 * work in, whatever a saved layout or a drag asked for.
 */

export type PaneId = ReelStudioPaneId;
export type PaneMode = ReelStudioPaneMode;

export interface PaneState {
  id: PaneId;
  mode: PaneMode;
  size: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type StudioLayout = Readonly<Record<PaneId, PaneState>>;

export interface PaneLimit {
  min: number;
  max: number;
  /** The docked size a fresh studio starts with; 0 for the player, which takes the rest. */
  start: number;
}

export const PANE_ORDER: readonly PaneId[] = ['SOURCES', 'PREVIEW', 'SIDE', 'TIMELINE'];

/** The panes that sit side by side; the timeline runs under them. */
export const ROW_PANES: readonly PaneId[] = ['SOURCES', 'PREVIEW', 'SIDE'];

export const PANE_LIMITS: Readonly<Record<PaneId, PaneLimit>> = {
  SOURCES: { min: 240, max: 640, start: 320 },
  PREVIEW: { min: 320, max: 4000, start: 0 },
  SIDE: { min: 300, max: 720, start: 380 },
  TIMELINE: { min: 180, max: 640, start: 300 },
};

/** Where a pane's window opens the first time it pops out. */
const START_WINDOW = { width: 480, height: 560 };
/** Each pane's first window is offset from the last, so two popped panes never open stacked exactly. */
const WINDOW_STEP = 40;

export const clampSize = (id: PaneId, size: number): number => {
  const { min, max } = PANE_LIMITS[id];
  return Math.round(Math.min(max, Math.max(min, size)));
};

function startPane(id: PaneId): PaneState {
  const step = PANE_ORDER.indexOf(id) * WINDOW_STEP;
  return { id, mode: 'DOCKED', size: PANE_LIMITS[id].start, x: 96 + step, y: 96 + step, width: START_WINDOW.width, height: START_WINDOW.height };
}

export function defaultLayout(): StudioLayout {
  return { SOURCES: startPane('SOURCES'), PREVIEW: startPane('PREVIEW'), SIDE: startPane('SIDE'), TIMELINE: startPane('TIMELINE') };
}

const whole = (value: number): number => (Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0);

/** A saved layout over the defaults: unknown panes ignored, missing ones defaulted, every size back within its limits. */
export function fromSaved(panes: readonly PaneState[] | null | undefined): StudioLayout {
  const layout: Record<PaneId, PaneState> = { ...defaultLayout() };
  for (const pane of panes ?? []) {
    if (!PANE_ORDER.includes(pane.id)) continue;
    const start = layout[pane.id];
    layout[pane.id] = {
      id: pane.id,
      mode: pane.mode,
      size: start.size === 0 ? 0 : clampSize(pane.id, pane.size || start.size),
      x: whole(pane.x),
      y: whole(pane.y),
      width: whole(pane.width) || start.width,
      height: whole(pane.height) || start.height,
    };
  }
  return layout;
}

export const withPane = (layout: StudioLayout, id: PaneId, change: Partial<Omit<PaneState, 'id'>>): StudioLayout => ({
  ...layout,
  [id]: { ...layout[id], ...change, id },
});

export const withMode = (layout: StudioLayout, id: PaneId, mode: PaneMode): StudioLayout => withPane(layout, id, { mode });

/** A docked size from a drag; the player's is never kept, since it is whatever is left. */
export const withSize = (layout: StudioLayout, id: PaneId, size: number): StudioLayout =>
  PANE_LIMITS[id].start === 0 ? layout : withPane(layout, id, { size: clampSize(id, size) });

export const withRect = (layout: StudioLayout, id: PaneId, rect: { x: number; y: number; width: number; height: number }): StudioLayout =>
  withPane(layout, id, { x: whole(rect.x), y: whole(rect.y), width: whole(rect.width), height: whole(rect.height) });

/** The docked panes of the row, in screen order. */
export const dockedRow = (layout: StudioLayout): PaneId[] => ROW_PANES.filter((id) => layout[id].mode === 'DOCKED');

/** The layout as the server keeps it. */
export const toPanes = (layout: StudioLayout): PaneState[] => PANE_ORDER.map((id) => ({ ...layout[id] }));

export function sameLayout(a: StudioLayout, b: StudioLayout): boolean {
  return PANE_ORDER.every((id) => {
    const left = a[id];
    const right = b[id];
    return left.mode === right.mode && left.size === right.size && left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
  });
}
