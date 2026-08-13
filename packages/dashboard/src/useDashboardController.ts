import { useCallback, useMemo, useRef, useState } from 'react';
import { defaultLayout, layoutsEqual, resolveLayout } from './layout';
import { useDashboardLayout } from './useDashboardLayout';
import { useGridStack } from './useGridStack';
import type { DashboardLayoutItem, DashboardWidget } from './types';

export interface DashboardControllerLabels {
  saveFailed: string;
  resetFailed: string;
  loadFailed: string;
}

export interface DashboardController {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Null until the saved layout (or the cached copy) is known. */
  layout: DashboardLayoutItem[] | null;
  editing: boolean;
  dirty: boolean;
  saving: boolean;
  /** Inline message shown above the grid — a failed load, save or reset. */
  error: string | null;
  confirmingReset: boolean;
  startEditing: () => void;
  cancelEditing: () => void;
  /** Fire-and-forget: failures land in `error`, so nothing is left to await. */
  saveLayout: () => void;
  askReset: () => void;
  closeReset: () => void;
  confirmReset: () => void;
}

/**
 * Everything a dashboard does that is not rendering: what the saved layout
 * resolves to, whether the user is editing, and what Save / Cancel / Reset do
 * to the live grid.
 *
 * Split from the component so `DuncitDashboard` stays a rendering function, and
 * so this logic can be exercised without a GridStack DOM.
 */
export function useDashboardController(
  dashboardId: string,
  widgets: readonly DashboardWidget[],
  labels: DashboardControllerLabels,
  cellHeight?: number
): DashboardController {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { saved, ready, saving, loadFailed, save, reset } = useDashboardLayout(dashboardId);

  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  /** Where the widgets sat when editing began — what Cancel puts back. */
  const baselineRef = useRef<DashboardLayoutItem[]>([]);

  // The page rebuilds `widgets` on every render (their content holds live query
  // data), so the layout is keyed off the widget SET, not the array identity.
  const widgetsRef = useRef(widgets);
  widgetsRef.current = widgets;
  const widgetsKey = widgets.map((widget) => widget.id).join('|');

  const layout = useMemo(
    () => (ready ? resolveLayout(widgetsRef.current, saved) : null),
    [ready, widgetsKey, saved]
  );

  const handleChange = useCallback((items: DashboardLayoutItem[]) => {
    setDirty(!layoutsEqual(items, baselineRef.current));
  }, []);

  const grid = useGridStack({
    containerRef,
    layout,
    editing,
    widgetsKey,
    cellHeight,
    onChange: handleChange,
  });

  const startEditing = useCallback(() => {
    baselineRef.current = grid.read();
    setDirty(false);
    setError(null);
    setEditing(true);
  }, [grid]);

  const cancelEditing = useCallback(() => {
    grid.apply(baselineRef.current);
    setDirty(false);
    setError(null);
    setEditing(false);
  }, [grid]);

  const finishEditing = useCallback(() => {
    setDirty(false);
    setEditing(false);
    setError(null);
  }, []);

  const saveLayout = useCallback(() => {
    save(grid.read())
      .then(finishEditing)
      .catch(() => setError(labels.saveFailed));
  }, [grid, save, finishEditing, labels.saveFailed]);

  const askReset = useCallback(() => setConfirmingReset(true), []);
  const closeReset = useCallback(() => setConfirmingReset(false), []);

  const confirmReset = useCallback(() => {
    setConfirmingReset(false);
    reset()
      .then(() => {
        grid.apply(defaultLayout(widgetsRef.current));
        finishEditing();
      })
      .catch(() => setError(labels.resetFailed));
  }, [grid, reset, finishEditing, labels.resetFailed]);

  return {
    containerRef,
    layout,
    editing,
    dirty,
    saving,
    error: error ?? (loadFailed ? labels.loadFailed : null),
    confirmingReset,
    startEditing,
    cancelEditing,
    saveLayout,
    askReset,
    closeReset,
    confirmReset,
  };
}
