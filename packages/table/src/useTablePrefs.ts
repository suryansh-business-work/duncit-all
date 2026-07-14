import { useCallback, useState } from 'react';
import {
  clearColumnVisibility,
  loadColumnVisibility,
  loadDensity,
  saveColumnVisibility,
  saveDensity,
  type TableDensity,
} from './persistence';

export interface UseTablePrefsResult {
  hiddenOverrides: Record<string, boolean>;
  toggleColumn: (field: string, currentlyHidden: boolean) => void;
  resetColumns: () => void;
  density: TableDensity;
  toggleDensity: () => void;
}

/** Column visibility + density, persisted per tableId in localStorage. */
export function useTablePrefs(tableId: string): UseTablePrefsResult {
  const [hiddenOverrides, setHiddenOverrides] = useState<Record<string, boolean>>(
    () => loadColumnVisibility(tableId) ?? {},
  );
  const [density, setDensity] = useState<TableDensity>(() => loadDensity(tableId) ?? 'standard');

  const toggleColumn = useCallback(
    (field: string, currentlyHidden: boolean) => {
      setHiddenOverrides((prev) => {
        const next = { ...prev, [field]: !currentlyHidden };
        saveColumnVisibility(tableId, next);
        return next;
      });
    },
    [tableId],
  );

  const resetColumns = useCallback(() => {
    clearColumnVisibility(tableId);
    setHiddenOverrides({});
  }, [tableId]);

  const toggleDensity = useCallback(() => {
    setDensity((prev) => {
      const next: TableDensity = prev === 'compact' ? 'standard' : 'compact';
      saveDensity(tableId, next);
      return next;
    });
  }, [tableId]);

  return { hiddenOverrides, toggleColumn, resetColumns, density, toggleDensity };
}
