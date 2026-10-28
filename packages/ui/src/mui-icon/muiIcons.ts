import type { SvgIconComponent } from '@mui/icons-material';

/** `@mui/icons-material` itself: export name → icon. */
export type MuiIconSet = Readonly<Record<string, SvgIconComponent>>;

let loaded: MuiIconSet | null = null;
let pending: Promise<MuiIconSet> | null = null;

/**
 * Every MUI icon (~10.7k exports, all five variants) as ONE lazy chunk that
 * every caller shares — a page that never draws an icon by name never
 * downloads it.
 */
export function loadMuiIcons(): Promise<MuiIconSet> {
  pending ??= import('@mui/icons-material').then(
    (set) => {
      loaded = set;
      return set;
    },
    (error: unknown) => {
      // A failed chunk (offline, a deploy mid-session) is fetched again by the next caller.
      pending = null;
      throw error;
    }
  );
  return pending;
}

/** The set if it has already arrived, so a remount draws without a blank frame. */
export const loadedMuiIcons = (): MuiIconSet | null => loaded;

/**
 * The icon names matching what was typed, best first: the exact name, then
 * names starting with it, then names containing it. Case and spaces are
 * ignored, so "music note" finds MusicNote. At most `limit` — a popup of all
 * ~10.7k rows would crawl, and two or three letters narrow it that far.
 */
export function searchMuiIconNames(names: readonly string[], query: string, limit: number): string[] {
  const needle = query.replaceAll(' ', '').toLowerCase();
  if (!needle) return names.slice(0, limit);
  const exact: string[] = [];
  const prefix: string[] = [];
  const contains: string[] = [];
  for (const name of names) {
    const lower = name.toLowerCase();
    if (lower === needle) exact.push(name);
    else if (lower.startsWith(needle)) prefix.push(name);
    else if (lower.includes(needle)) contains.push(name);
  }
  return [...exact, ...prefix, ...contains].slice(0, limit);
}
