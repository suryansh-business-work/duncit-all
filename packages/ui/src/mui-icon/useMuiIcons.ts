import { useEffect, useMemo, useState } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';
import { loadedMuiIcons, loadMuiIcons, type MuiIconSet } from './muiIcons';

const NO_ICONS: MuiIconSet = Object.freeze({});

export interface MuiIcons {
  /** Export name → icon. Index it only with a name from `names`. */
  icons: MuiIconSet;
  /** Every icon name, A→Z (a module namespace lists its exports sorted) — empty until the set arrives. */
  names: readonly string[];
  /** The icon exported under `name`; undefined for anything else (a typo, an emoji, a half-typed search). */
  find: (name: string) => SvgIconComponent | undefined;
  loading: boolean;
  /** The chunk could not be fetched; a remount tries again. */
  failed: boolean;
}

/**
 * The MUI icon set for a component that draws icons by name. Starts the
 * shared lazy load on mount. `onError` receives the cause of a failed load so
 * the host can log it with its own logger (this package has none).
 */
export function useMuiIcons(onError?: (error: unknown) => void): MuiIcons {
  const [set, setSet] = useState<MuiIconSet | null>(loadedMuiIcons);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (set || failed) return undefined;
    let live = true;
    loadMuiIcons().then(
      (next) => {
        if (live) setSet(next);
      },
      (error: unknown) => {
        if (!live) return;
        setFailed(true);
        onError?.(error);
      }
    );
    return () => {
      live = false;
    };
  }, [set, failed, onError]);

  return useMemo(() => {
    const icons = set ?? NO_ICONS;
    const names = Object.keys(icons);
    const known = new Set(names);
    return {
      icons,
      names,
      find: (name: string) => (known.has(name) ? icons[name] : undefined),
      loading: !set && !failed,
      failed,
    };
  }, [set, failed]);
}
