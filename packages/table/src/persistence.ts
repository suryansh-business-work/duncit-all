export type TableDensity = 'compact' | 'standard';

const COLS_PREFIX = 'duncit-table-cols:';
const DENSITY_PREFIX = 'duncit-table-density:';

function readItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage full / blocked — prefs simply don't persist
  }
}

function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Persisted per-table column overrides: field -> hidden. Null when nothing saved / corrupt. */
export function loadColumnVisibility(tableId: string): Record<string, boolean> | null {
  const raw = readItem(`${COLS_PREFIX}${tableId}`);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const result: Record<string, boolean> = {};
    for (const [field, hidden] of Object.entries(parsed)) {
      if (typeof hidden === 'boolean') result[field] = hidden;
    }
    return result;
  } catch {
    return null;
  }
}

export function saveColumnVisibility(tableId: string, hidden: Record<string, boolean>): void {
  writeItem(`${COLS_PREFIX}${tableId}`, JSON.stringify(hidden));
}

export function clearColumnVisibility(tableId: string): void {
  removeItem(`${COLS_PREFIX}${tableId}`);
}

export function loadDensity(tableId: string): TableDensity | null {
  const raw = readItem(`${DENSITY_PREFIX}${tableId}`);
  if (raw === 'compact' || raw === 'standard') return raw;
  return null;
}

export function saveDensity(tableId: string, density: TableDensity): void {
  writeItem(`${DENSITY_PREFIX}${tableId}`, density);
}
