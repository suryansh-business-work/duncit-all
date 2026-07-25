import type { ImageSourcePropType } from 'react-native';

/**
 * Bundled occasion icons, keyed by the SAME slug the admin sets in
 * Branding → Occasional icons.
 *
 * Metro cannot resolve a dynamic `require(\`./${slug}/icon.png\`)` — the path
 * must be a literal — so this map is deliberately static. That is also the
 * safety net: `require` of a missing file is a Metro bundling error, so a typo
 * or a deleted asset fails the build instead of shipping a broken icon.
 *
 * Add a folder under assets/occasions/<slug>/icon.png, then register it here.
 */
export const OCCASION_ICONS: Readonly<Record<string, ImageSourcePropType>> = {
  diwali: require('../../assets/occasions/diwali/icon.png') as ImageSourcePropType,
  'new-year': require('../../assets/occasions/new-year/icon.png') as ImageSourcePropType,
  christmas: require('../../assets/occasions/christmas/icon.png') as ImageSourcePropType,
  holi: require('../../assets/occasions/holi/icon.png') as ImageSourcePropType,
};

/** The bundled icon for a slug, or null when the app ships no art for it (the
 * caller then falls back to the admin's icon_url). */
export function bundledOccasionIcon(slug: string | null | undefined): ImageSourcePropType | null {
  if (!slug) return null;
  return OCCASION_ICONS[slug] ?? null;
}
