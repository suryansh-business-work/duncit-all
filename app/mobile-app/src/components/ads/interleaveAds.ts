import type { ActiveAd } from '@/hooks/useActiveAds';

/** An ad woven into a feed. `key` stays unique even when one ad repeats. */
export interface AdFeedEntry {
  kind: 'ad';
  key: string;
  ad: ActiveAd;
}

/** A regular feed item wrapped so lists can mix content with ads. */
export interface ContentFeedEntry<T> {
  kind: 'content';
  item: T;
}

export type FeedEntry<T> = ContentFeedEntry<T> | AdFeedEntry;

/** Discriminated-union guard — narrows a feed entry to the ad branch. */
export function isAdEntry<T>(entry: FeedEntry<T>): entry is AdFeedEntry {
  return entry.kind === 'ad';
}

/**
 * Weaves one ad after every `every` content items, cycling through `ads` when
 * the list is longer than the pool. No ads (or no content) → content-only, so
 * surfaces render exactly what they did before ads existed.
 */
export function interleaveAds<T>(
  items: readonly T[],
  ads: readonly ActiveAd[],
  every: number,
): FeedEntry<T>[] {
  const content: FeedEntry<T>[] = items.map((item) => ({ kind: 'content', item }));
  if (ads.length === 0) return content;

  const feed: FeedEntry<T>[] = [];
  let slot = 0;
  content.forEach((entry, index) => {
    feed.push(entry);
    if ((index + 1) % every === 0) {
      const ad = ads[slot % ads.length] as ActiveAd;
      feed.push({ kind: 'ad', key: `ad-${ad.id}-${index}`, ad });
      slot += 1;
    }
  });
  return feed;
}
