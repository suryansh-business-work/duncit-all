import { useCallback, useMemo, useState } from 'react';
import { logs } from '@duncit/logs';
import {
  QUICK_ACCESS_STORAGE_KEY,
  parseStoredQuickAccess,
  type ProfileMenuFlags,
  type ProfileMenuKey,
} from '@duncit/utils';

function readRaw(): string | null {
  try {
    return localStorage.getItem(QUICK_ACCESS_STORAGE_KEY);
  } catch (error) {
    // Storage blocked (private mode, a sandboxed frame): the default grid.
    logs.mWeb.warn('quickAccess', 'read', { error });
    return null;
  }
}

/**
 * The member's Quick Access tiles in the account menu, kept in this browser.
 * `save` shows the pick at once and reports whether the browser kept it — a
 * refused write still holds for this visit. Native twin: stores/quick-access.
 */
export function useQuickAccess(flags: ProfileMenuFlags) {
  const [raw, setRaw] = useState(readRaw);
  const selection = useMemo(() => parseStoredQuickAccess(raw, flags), [raw, flags]);

  const save = useCallback((next: readonly ProfileMenuKey[]): boolean => {
    const value = JSON.stringify(next);
    setRaw(value);
    try {
      localStorage.setItem(QUICK_ACCESS_STORAGE_KEY, value);
      return true;
    } catch (error) {
      logs.mWeb.warn('quickAccess', 'write', { error });
      return false;
    }
  }, []);

  return { selection, save };
}
