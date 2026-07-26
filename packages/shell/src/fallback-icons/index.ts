import type { FallbackIconManifest } from '@duncit/fallback-icons';

import allVibe from './all-vibe.svg';
import favicon from './favicon.png';
import logo from './logo.png';
import occasion from './occasion.svg';
import placeholder from './placeholder.svg';
import splash from './splash.png';

/**
 * The portals' local fallback icons (CLAUDE.md rule 39) — rendered whenever the
 * admin's server URL is missing or fails to load.
 *
 * ONE bundle for all 17 portals rather than a folder each: every portal renders
 * its chrome through this shell, so a per-portal copy would be 17 sets of the
 * same bytes with 17 chances to drift, which rule 34 exists to prevent. Each
 * portal still SHIPS the icons — Vite compiles them into that portal's build.
 *
 * These are STATIC imports on purpose, and they live under src/ rather than
 * public/: Vite copies public/ blindly without checking, whereas a static
 * import of a missing file fails the Rollup build. Typing the object as
 * FallbackIconManifest additionally makes a MISSING NAME a tsc error.
 */
export const FALLBACK_ICONS: FallbackIconManifest<string> = {
  logo,
  favicon,
  splash,
  'all-vibe': allVibe,
  placeholder,
  occasion,
};
