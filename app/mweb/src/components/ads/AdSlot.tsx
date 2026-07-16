import type { SxProps, Theme } from '@mui/material';
import AdCard from './AdCard';
import AdTile from './AdTile';
import { useActiveAds, type AdPosition, type PublicAd } from './useActiveAds';

export type AdSlotVariant = 'banner' | 'card' | 'tile';

interface AdSlotProps {
  position: AdPosition;
  variant?: AdSlotVariant;
  sx?: SxProps<Theme>;
}

/** Drop-in single-ad slot: fetches the placement's live ads and renders the
 * first one in the requested shape. No inventory → renders nothing (no layout
 * gap, no skeleton). */
export default function AdSlot({ position, variant = 'banner', sx }: Readonly<AdSlotProps>) {
  const { ads } = useActiveAds(position);
  const ad = ads[0];
  if (!ad) return null;
  if (variant === 'tile') return <AdTile ad={ad} />;
  return <AdCard ad={ad} variant={variant} sx={sx} />;
}

/** An interleaved ad entry — distinguishable from list items via isAdEntry. */
export interface AdEntry {
  __ad: PublicAd;
}

export function isAdEntry<T>(entry: T | AdEntry): entry is AdEntry {
  return typeof entry === 'object' && entry !== null && '__ad' in entry;
}

/** Weave one ad after every `every` items. Each ad is used at most once so
 * React keys (ad.id) stay unique; with no ads the original list is returned
 * untouched (zero visual change for empty inventory). */
export function interleaveAds<T>(items: T[], ads: PublicAd[], every: number): Array<T | AdEntry> {
  if (ads.length === 0 || every <= 0) return items;
  const out: Array<T | AdEntry> = [];
  let adIndex = 0;
  items.forEach((item, index) => {
    out.push(item);
    if ((index + 1) % every === 0 && adIndex < ads.length) {
      out.push({ __ad: ads[adIndex] });
      adIndex += 1;
    }
  });
  return out;
}
