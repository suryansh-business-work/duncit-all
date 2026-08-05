import type { ActiveAd } from '@/hooks/useActiveAds';
import type { StatusGroup, StatusSlide } from '@/hooks/useStatus';
import type { StoryTarget } from '@/hooks/useStoryRail';

/** A sponsored story: a story group like any other, plus the ad's landing page
 * as its "Open details" target. */
export type AdStory = StatusGroup & { subLabel?: string | null; target?: StoryTarget };

/**
 * Turn a live ad into a story the viewer can play.
 *
 * A sponsored tile in a story rail opens AS A STORY — it never leaves for the
 * advertiser's page on tap. When the ad carries a link, that link becomes the
 * story's "Open details" button, so leaving is the viewer's choice. RN twin of
 * mWeb's buildAdViewer.
 */
export function buildAdStory(ad: ActiveAd): AdStory {
  const slide: StatusSlide = {
    id: `ad-${ad.id}`,
    imageUrl: ad.media_url,
    mediaType: ad.ad_type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
    caption: null,
    // No expiry: an ad's live window is the server's business, not a countdown
    // shown over the story.
    expiresAt: null,
    seenByMe: false,
    likedByMe: false,
    likesCount: 0,
  };
  return {
    authorId: slide.id,
    name: ad.ad_title || 'Sponsored',
    photo: ad.media_url,
    slides: [slide],
    cover: slide,
    subLabel: 'Sponsored',
    target: ad.redirect_url ? { kind: 'link', url: ad.redirect_url } : undefined,
  };
}
