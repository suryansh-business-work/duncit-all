import type { FallbackIconManifest } from '@duncit/fallback-icons';

import allVibeArt from './all-vibe.svg';
import faviconArt from './favicon.png';
import logoArt from './logo.png';
import occasionArt from './occasion.svg';
import placeholderArt from './placeholder.svg';
import splashArt from './splash.png';

/**
 * The storefront's bundled stand-ins for every branding image the store reads
 * from the server (project rule 39). The store logo, a product photo or a
 * banner can be blank, deleted or unreachable; `resolveIconSource` hands back
 * one of these instead, so the page never paints a broken image.
 *
 * Kept under src/ and imported statically: a missing file fails the Vite build,
 * and the manifest type turns a missing NAME into a tsc error.
 */
export const STORE_FALLBACK_ICONS: FallbackIconManifest<string> = {
  placeholder: placeholderArt,
  logo: logoArt,
  favicon: faviconArt,
  occasion: occasionArt,
  splash: splashArt,
  'all-vibe': allVibeArt,
};
