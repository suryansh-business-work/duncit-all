import { useCallback, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { TableQuerySnapshot } from '@duncit/table';

export interface TelemetryTableSelection<T> {
  /** Hand straight to DuncitTable's `selection` prop. */
  selection: {
    onChange: (rows: T[]) => void;
    clearRef: MutableRefObject<(() => void) | null>;
  };
  /** Hand straight to DuncitTable's `onQueryChange` prop. */
  onQueryChange: (snapshot: TableQuerySnapshot) => void;
  /** Hand straight to DuncitTable's `refetchRef` prop. */
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Ids ticked on the page on screen. */
  selectedIds: string[];
  /** What the table is showing — null until the first fetch has answered. */
  view: TableQuerySnapshot | null;
  clear: () => void;
  /** Drop the ticks and reload, once rows have actually gone. */
  afterDelete: () => void;
  refetch: () => void;
}

/**
 * The wiring all three telemetry tables need to support a bulk delete: the
 * ticks, the query behind them, and the two refs that clear and reload.
 *
 * It is a hook rather than three copies because the pages had otherwise each
 * carried the same half-dozen refs, and a bulk delete is exactly the feature
 * where one of those copies drifting — a clear that does not fire, a snapshot
 * that lags a filter — deletes the wrong rows (rule 40).
 */
export function useTelemetryTableSelection<T>(
  getId: (row: T) => string,
): TelemetryTableSelection<T> {
  const refetchRef = useRef<(() => void) | null>(null);
  const clearSelectionRef = useRef<(() => void) | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [view, setView] = useState<TableQuerySnapshot | null>(null);

  // Read through a ref so `selection` can be built once: a fresh object each
  // render makes the grid reconfigure selection mid-tick.
  const idRef = useRef(getId);
  idRef.current = getId;

  const selection = useMemo(
    () => ({
      onChange: (rows: T[]) => setSelectedIds(rows.map((row) => idRef.current(row))),
      clearRef: clearSelectionRef,
    }),
    [],
  );

  // Clearing goes through the grid; it echoes the empty selection back to us.
  const clear = useCallback(() => clearSelectionRef.current?.(), []);
  const refetch = useCallback(() => refetchRef.current?.(), []);
  const afterDelete = useCallback(() => {
    clearSelectionRef.current?.();
    refetchRef.current?.();
  }, []);

  /*
   * Ticks belong to a SET, so a change to the set drops them.
   *
   * The grid drops its own ticks when the rows under them are replaced, which
   * covers a filter edit — but not the Telemetry Logs tabs, where the table is
   * keyed per level and a switch UNMOUNTS it. An unmount fires no selection
   * event, so ids ticked on the error tab would still be sitting here while the
   * debug tab is on screen, and the bar would offer to delete rows nobody can
   * see. Search and filters alone are the key: paging and sorting leave the set
   * exactly as it was.
   */
  const setKeyRef = useRef<string | null>(null);
  const onQueryChange = useCallback((snapshot: TableQuerySnapshot) => {
    const key = JSON.stringify({ s: snapshot.query.search, f: snapshot.query.filters });
    if (setKeyRef.current !== null && setKeyRef.current !== key) {
      clearSelectionRef.current?.();
      setSelectedIds([]);
    }
    setKeyRef.current = key;
    setView(snapshot);
  }, []);

  return {
    selection,
    onQueryChange,
    refetchRef,
    selectedIds,
    view,
    clear,
    afterDelete,
    refetch,
  };
}
