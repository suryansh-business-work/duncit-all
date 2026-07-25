import type { ImageSourcePropType } from 'react-native';
import { resolveActiveOccasion } from '@duncit/datetime';

import { bundledOccasionIcon } from '@/assets/occasion-icons';
import { useBranding } from '@/hooks/useBranding';
import { useDateFormat } from '@/hooks/useDateFormat';

export interface ActiveOccasion {
  slug: string;
  label: string;
  /** Bundled art when the app ships this slug, else the admin's hosted icon. */
  source: ImageSourcePropType;
  /** True when the icon came from the app bundle rather than the network. */
  isBundled: boolean;
}

/**
 * The occasion active right now, or null outside every window.
 *
 * "Now" comes from the application clock, so an admin's custom time switches
 * the icons exactly as it switches dates. The bundled asset for the slug wins
 * over the admin's icon_url so festive art appears instantly and works offline;
 * an occasion configured in Admin but not shipped in the bundle still renders
 * from its URL.
 */
export function useOccasionIcon(): ActiveOccasion | null {
  const { data } = useBranding();
  const { clock } = useDateFormat();

  const occasion = resolveActiveOccasion(data?.branding?.occasional_icons, clock.nowMs());
  if (!occasion) return null;

  const bundled = bundledOccasionIcon(occasion.slug);
  if (bundled) {
    return { slug: occasion.slug, label: occasion.label ?? '', source: bundled, isBundled: true };
  }
  if (!occasion.icon_url) return null;
  return {
    slug: occasion.slug,
    label: occasion.label ?? '',
    source: { uri: occasion.icon_url },
    isBundled: false,
  };
}
