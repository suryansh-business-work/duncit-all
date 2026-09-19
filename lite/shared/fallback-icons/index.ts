import type { FallbackIconManifest } from '@duncit/fallback-icons';

import allVibeArt from './all-vibe.svg';
import faviconArt from './favicon.png';
import logoArt from './logo.png';
import occasionArt from './occasion.svg';
import placeholderArt from './placeholder.svg';
import splashArt from './splash.png';

/**
 * Lite's bundled stand-ins for every image it reads from a URL (project rule
 * 39): a cover, an avatar or a city picture can be blank, deleted or offline,
 * and `resolveIconSource` hands back one of these instead of a broken image.
 */
export const LITE_FALLBACK_ICONS: FallbackIconManifest<string> = {
  placeholder: placeholderArt,
  logo: logoArt,
  favicon: faviconArt,
  occasion: occasionArt,
  splash: splashArt,
  'all-vibe': allVibeArt,
};
