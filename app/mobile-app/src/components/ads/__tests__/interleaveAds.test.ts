import { interleaveAds, isAdEntry, type FeedEntry } from '@/components/ads/interleaveAds';
import { AdMediaType, AdPosition } from '@/generated/graphql/graphql';
import type { ActiveAd } from '@/hooks/useActiveAds';

const ad = (id: string): ActiveAd => ({
  id,
  ad_type: AdMediaType.Image,
  media_url: `https://cdn/${id}.jpg`,
  redirect_url: null,
  ad_title: `Ad ${id}`,
  position: AdPosition.Auto,
});

const shape = (feed: FeedEntry<string>[]) =>
  feed.map((entry) => (isAdEntry(entry) ? entry.key : entry.item));

describe('interleaveAds', () => {
  it('weaves one ad after every N content items', () => {
    const feed = interleaveAds(['a', 'b', 'c', 'd', 'e'], [ad('x')], 2);
    expect(shape(feed)).toEqual(['a', 'b', 'ad-x-1', 'c', 'd', 'ad-x-3', 'e']);
  });

  it('cycles through the ad pool with unique keys per slot', () => {
    const feed = interleaveAds(['a', 'b', 'c'], [ad('x'), ad('y')], 1);
    expect(shape(feed)).toEqual(['a', 'ad-x-0', 'b', 'ad-y-1', 'c', 'ad-x-2']);
  });

  it('returns content untouched when there are no ads', () => {
    const feed = interleaveAds(['a', 'b'], [], 2);
    expect(shape(feed)).toEqual(['a', 'b']);
  });

  it('returns an empty feed for empty content (never an ads-only list)', () => {
    expect(interleaveAds([], [ad('x')], 2)).toEqual([]);
  });

  it('narrows entries through the isAdEntry guard', () => {
    const [content, sponsored] = interleaveAds(['a'], [ad('x')], 1);
    expect(content && isAdEntry(content)).toBe(false);
    expect(sponsored && isAdEntry(sponsored)).toBe(true);
  });
});
