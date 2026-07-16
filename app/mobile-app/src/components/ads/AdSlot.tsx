import { useActiveAds, type AdPositionValue } from '@/hooks/useActiveAds';
import { AdCard, type AdVariant } from './AdCard';

/**
 * One self-fetching ad placement: loads the position's live ads and renders the
 * first as an AdCard, or nothing at all — so a surface can declare a slot
 * unconditionally and pay zero layout cost while no ad is booked.
 */
export function AdSlot({
  position,
  variant,
}: Readonly<{ position: AdPositionValue; variant: AdVariant }>) {
  const { ads } = useActiveAds(position);
  const ad = ads[0];
  if (!ad) return null;
  return <AdCard ad={ad} variant={variant} testID={`ad-slot-${position}`} />;
}
