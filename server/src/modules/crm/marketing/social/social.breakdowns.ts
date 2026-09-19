import { appFormat } from '@utils/app-time';
import type { SocialPlatform } from './social.types';

/**
 * The period's posts split the ways a marketer plans by: which network, which
 * day of the week and which hour of the day a post did best on, and the posts
 * that did best of all. Weekdays and hours are the admin's zone, so "Tuesday
 * 6 pm" is the marketer's Tuesday.
 */
export interface PostNumbers {
  _id: unknown;
  account_id: string;
  platform: SocialPlatform;
  text: string;
  published_at: Date;
  likes: number;
  comments: number;
  shares: number;
  views: number | null;
  engagement: number;
}

/** `Map.groupBy`, which the server's ES2022 lib does not have yet. */
export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

export const sumOf = (posts: readonly PostNumbers[], pick: (post: PostNumbers) => number) =>
  posts.reduce((total, post) => total + pick(post), 0);

const round1 = (value: number) => Math.round(value * 10) / 10;

export function platformSplit(posts: readonly PostNumbers[]) {
  return [...groupBy(posts, (post) => post.platform)].map(([platform, own]) => ({
    platform,
    posts: own.length,
    engagement: sumOf(own, (p) => p.engagement),
  }));
}

/**
 * Average engagement per post in each slot. An average, not a sum: three
 * posts on a Tuesday would otherwise always beat one great post on a Sunday.
 */
function averagesBy(posts: readonly PostNumbers[], slots: number, slotOf: (post: PostNumbers) => number): number[] {
  const totals = new Array<number>(slots).fill(0);
  const counts = new Array<number>(slots).fill(0);
  for (const post of posts) {
    const slot = slotOf(post);
    if (slot < 0 || slot >= slots) continue;
    totals[slot] += post.engagement;
    counts[slot] += 1;
  }
  return totals.map((total, slot) => (counts[slot] > 0 ? round1(total / counts[slot]) : 0));
}

/** Monday first — ISO weekday 1 is index 0. */
export const weekdayAverages = (posts: readonly PostNumbers[]) =>
  averagesBy(posts, 7, (post) => Number(appFormat(post.published_at, 'i')) - 1);

export const hourAverages = (posts: readonly PostNumbers[]) =>
  averagesBy(posts, 24, (post) => Number(appFormat(post.published_at, 'H')));

export function topPosts(posts: readonly PostNumbers[], names: Map<string, string>, limit = 5) {
  const ranked = [...posts];
  ranked.sort((a, b) => b.engagement - a.engagement);
  return ranked.slice(0, limit).map((post) => ({
    id: String(post._id),
    text: post.text.slice(0, 120),
    platform: post.platform,
    account_name: names.get(post.account_id) ?? '',
    engagement: post.engagement,
  }));
}
