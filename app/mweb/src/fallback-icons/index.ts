import type { FallbackIconManifest } from '@duncit/fallback-icons';

import allVibe from './all-vibe.svg';
import favicon from './favicon.png';
import logo from './logo.png';
import occasion from './occasion.svg';
import placeholder from './placeholder.svg';
import splash from './splash.png';

/**
 * mWeb's local fallback icons — rendered whenever the admin's server URL is
 * missing or fails to load.
 *
 * These are STATIC imports on purpose, and they live under src/ rather than
 * public/: Vite copies public/ blindly without checking, whereas a static
 * import of a missing file fails the Rollup build. Typing the object as
 * FallbackIconManifest additionally makes a MISSING NAME a tsc error. So an
 * incomplete fallback set cannot be built, let alone shipped.
 */
export const FALLBACK_ICONS: FallbackIconManifest<string> = {
  logo,
  favicon,
  splash,
  'all-vibe': allVibe,
  placeholder,
  occasion,
};
