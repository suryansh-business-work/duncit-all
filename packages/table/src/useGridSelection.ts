import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import type { SelectionChangedEvent } from 'ag-grid-community';
import type { AgGridReact } from 'ag-grid-react';

/**
 * Opt-in checkbox multi-select. Selection is PER PAGE and what you get is a MIRROR of
 * the grid, never a running total — see the note on handleSelectionChanged for why an
 * accumulator across pages is a bug rather than a feature.
 */
export interface DuncitTableSelection<T> {
  /** The rows ticked right now. Fires with `[]` when a page change wipes them. */
  onChange: (rows: T[]) => void;
  /** Filled with a "clear the ticks" fn, like refetchRef — call it after a bulk action. */
  clearRef?: RefObject<(() => void) | null>;
}

interface GridSelectionOptions<T> {
  gridRef: RefObject<AgGridReact<T> | null>;
  /** The page's own selection, when it asked for one. */
  selection?: DuncitTableSelection<T>;
  /** The grid offers bulk delete, which needs the checkbox column whether or not the page asked. */
  bulk: boolean;
  getRowId: (row: T) => string;
}

/**
 * The checkbox column's state, as the grid and its toolbar need it: whether
 * there is one, the ids ticked right now, and how to clear them.
 */
export function useGridSelection<T>({ gridRef, selection, bulk, getRowId }: GridSelectionOptions<T>) {
  const onChange = selection?.onChange;
  const clearRef = selection?.clearRef;
  const selectable = Boolean(selection) || bulk;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /**
   * Selection is per page, and the parent gets a mirror of the grid.
   *
   * `getRowId` is always set here, so AG Grid runs its immutable update path, and
   * retention is BY ID: on new row data it deletes the nodes whose ids are gone and
   * deselects those, dispatching selectionChanged with source 'rowDataChanged'. A
   * page turn drops the ticks and calls this again — with an empty array when nothing
   * survived. A refetch that returns the same ids keeps them ticked and fires nothing
   * at all, so the objects the parent is holding are the PRE-refetch ones: act on
   * their ids, not on the rest of their fields.
   *
   * The parent must store what it is handed and nothing else. A Set of ids accumulated
   * across pages would claim "47 selected" while the grid holds 25 rows, and would act
   * on rows nobody saw.
   *
   * The header checkbox is not "select all" either. AG Grid's client-side row model
   * only ever holds the rows the server returned for this page, so every SelectAllMode
   * ticks this page. Say so on screen; do not imply otherwise.
   */
  const handleSelectionChanged = useMemo(() => {
    if (!selectable) return undefined;
    return (event: SelectionChangedEvent<T>) => {
      const rows = event.api.getSelectedRows();
      onChange?.(rows);
      setSelectedIds(rows.map(getRowId));
    };
  }, [selectable, onChange, getRowId]);

  // Clearing has to happen in the GRID: resetting only the parent's state leaves the
  // checkboxes ticked. deselectAll fires selectionChanged, so the parent's own mirror
  // empties through the handler above rather than needing a second reset.
  const clearSelection = useCallback(() => {
    gridRef.current?.api?.deselectAll();
  }, [gridRef]);

  useEffect(() => {
    if (!clearRef) return undefined;
    clearRef.current = clearSelection;
    return () => {
      clearRef.current = null;
    };
  }, [clearRef, clearSelection]);

  return { selectable, selectedIds, handleSelectionChanged, clearSelection };
}
