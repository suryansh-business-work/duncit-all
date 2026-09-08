import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { LayoutDirection } from './layout';

/**
 * The canvas view a manager left behind: which way the tree runs, what they
 * were searching for, and where they had panned to.
 *
 * The first two live in the URL, not in component state, so the view survives a
 * reload and can be pasted to somebody else — a region is a shared object, and
 * "look at the Gurgaon branch" is worth being able to send. The VIEWPORT lives
 * in localStorage instead: a pan-and-zoom is a habit rather than a fact about
 * the region, and putting it in the address bar would rewrite the URL on every
 * mouse wheel.
 */
const DIRECTION_KEY = 'regional_canvas_direction';
const VIEWPORT_KEY = 'regional_canvas_viewport';

export interface SavedViewport {
  x: number;
  y: number;
  zoom: number;
}

/** Reading storage throws outright in a browser set to block site data, so
 * every read and write is guarded and a failure simply means "no saved view". */
function readStored(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    /* a browser blocking site data is not an error worth showing anyone */
  }
}

const isDirection = (value: string | null): value is LayoutDirection =>
  value === 'LR' || value === 'TB';

export function loadViewport(): SavedViewport | null {
  const raw = readStored(VIEWPORT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedViewport>;
    const { x, y, zoom } = parsed;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof zoom !== 'number') return null;
    return { x, y, zoom };
  } catch {
    return null;
  }
}

export function saveViewport(viewport: SavedViewport) {
  writeStored(VIEWPORT_KEY, JSON.stringify(viewport));
}

export function clearViewport() {
  writeStored(VIEWPORT_KEY, '');
}

export function useRegionView() {
  const [params, setParams] = useSearchParams();

  const direction = useMemo<LayoutDirection>(() => {
    const fromUrl = params.get('dir');
    if (isDirection(fromUrl)) return fromUrl;
    const remembered = readStored(DIRECTION_KEY);
    return isDirection(remembered) ? remembered : 'LR';
  }, [params]);

  const search = params.get('q') ?? '';

  const setDirection = useCallback(
    (next: LayoutDirection) => {
      writeStored(DIRECTION_KEY, next);
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          updated.set('dir', next);
          return updated;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setSearch = useCallback(
    (next: string) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          if (next) updated.set('q', next);
          else updated.delete('q');
          return updated;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { direction, setDirection, search, setSearch };
}
