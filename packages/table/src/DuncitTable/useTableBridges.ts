import { useEffect, useSyncExternalStore, type MutableRefObject, type RefObject } from 'react';
import { ambientDateSettings, subscribeAmbientDateSettings } from '@duncit/datetime';
import type { AgGridReact } from 'ag-grid-react';
import type { TableQuerySnapshot, TableQueryState } from '../types';

interface TableBridgeOptions<T> {
  gridRef: RefObject<AgGridReact<T> | null>;
  refetchRef?: MutableRefObject<(() => void) | null>;
  refetch: () => void;
  updateRowRef?: MutableRefObject<((row: T) => void) | null>;
  updateRow: (row: T) => void;
  onQueryChange?: (snapshot: TableQuerySnapshot) => void;
  appliedQuery: TableQueryState;
  total: number;
}

/**
 * What the table keeps in step with the world outside it: the parent's refetch
 * and update-row refs, the parent's view of the applied query, and the admin's
 * date settings.
 */
export function useTableBridges<T>(options: TableBridgeOptions<T>): void {
  const { gridRef, refetchRef, refetch, updateRowRef, updateRow, onQueryChange, appliedQuery, total } =
    options;

  useEffect(() => {
    if (!refetchRef) return undefined;
    refetchRef.current = refetch;
    return () => {
      refetchRef.current = null;
    };
  }, [refetchRef, refetch]);

  useEffect(() => {
    if (!updateRowRef) return undefined;
    updateRowRef.current = updateRow;
    return () => {
      updateRowRef.current = null;
    };
  }, [updateRowRef, updateRow]);

  // The applied query, not `table.query`: a page that pins its own filters (a
  // level tab, an error-module marker) must hand out a scope that carries them,
  // or an action on "everything matching this view" would reach past the view.
  useEffect(() => {
    onQueryChange?.({ query: appliedQuery, total });
  }, [onQueryChange, appliedQuery, total]);

  /*
   * Date cells read the admin's pattern inside their value getter, and the
   * settings arrive over the network — a grid that mounted first would keep
   * painting the fallback pattern until something else made it repaint. AG Grid
   * caches getter results, so a React re-render alone is not enough; the cells
   * have to be told.
   */
  const dateSettings = useSyncExternalStore(subscribeAmbientDateSettings, ambientDateSettings);
  useEffect(() => {
    gridRef.current?.api?.refreshCells({ force: true });
  }, [dateSettings]);
}
