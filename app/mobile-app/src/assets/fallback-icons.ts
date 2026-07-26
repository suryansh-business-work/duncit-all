import type { ImageSourcePropType } from 'react-native';
import type { FallbackIconManifest } from '@duncit/fallback-icons';

/**
 * The native app's local fallback icons — rendered whenever the admin's server
 * URL is missing or fails to load.
 *
 * Static `require`s on purpose: Metro cannot resolve a computed path, and a
 * require of a missing file is a bundling error. Typing the object as
 * FallbackIconManifest additionally makes a missing NAME a tsc error. The
 * build-chained scripts/verify-fallback-icons.mjs covers the third case — a
 * manifest nothing imports, which the bundler would never look at.
 */
export const FALLBACK_ICONS: FallbackIconManifest<ImageSourcePropType> = {
  logo: require('../../assets/fallback-icons/logo.png') as ImageSourcePropType,
  favicon: require('../../assets/fallback-icons/favicon.png') as ImageSourcePropType,
  splash: require('../../assets/fallback-icons/splash.png') as ImageSourcePropType,
  'all-vibe': require('../../assets/fallback-icons/all-vibe.png') as ImageSourcePropType,
  placeholder: require('../../assets/fallback-icons/placeholder.png') as ImageSourcePropType,
  occasion: require('../../assets/fallback-icons/occasion.png') as ImageSourcePropType,
};
