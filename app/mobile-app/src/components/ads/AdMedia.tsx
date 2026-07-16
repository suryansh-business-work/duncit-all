import { AppImage } from '@/components/AppImage';
import { ReelVideo } from '@/components/explore/ReelVideo';
import type { ActiveAd } from '@/hooks/useActiveAds';

/**
 * The media area of an ad card: a cached image, or a muted looping video via
 * ReelVideo. Card placements leave `isActive` at its always-playing default
 * (the SidebarVenuesCard pattern); the Explore reel gates it on visibility.
 * Fills its parent, which owns the shape (rounded card, circle tile, …).
 */
export function AdMedia({
  ad,
  testID,
  isActive = true,
}: Readonly<{ ad: ActiveAd; testID: string; isActive?: boolean }>) {
  if (ad.ad_type === 'VIDEO') {
    return <ReelVideo url={ad.media_url} isActive={isActive} testID={`${testID}-video`} />;
  }
  return (
    <AppImage
      testID={`${testID}-image`}
      source={{ uri: ad.media_url }}
      style={{ width: '100%', height: '100%' }}
      resizeMode="cover"
      accessibilityLabel={ad.ad_title}
    />
  );
}
