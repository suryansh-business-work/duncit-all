import { AppInsightStateModel } from './appInsights.model';
import { replaceMetrics } from './appInsights.store';
import { APPLE_REVIEW_OWNS, countAppleReviews, type AppleReview } from './appStore.reports';
import type { AscClient } from './appStore.sync';

/**
 * App Store customer reviews, counted per day and star.
 *
 * Apple lists reviews newest first. A sync reads back to a little before the
 * last day it read completely (reviews can arrive late), or 400 days on the
 * first run, and then rewrites every day in that span — so the counts for
 * those days are always the full count, never an increment.
 */

const STORE = 'APP_STORE' as const;
const DAY_MS = 86_400_000;
const FIRST_RUN_DAYS = 400;
/** Days re-read before the last complete one. */
const OVERLAP_DAYS = 3;

const dayBefore = (day: string, days: number) =>
  new Date(new Date(`${day}T00:00:00.000Z`).getTime() - days * DAY_MS).toISOString().slice(0, 10);

/** The first day this sync must read reviews from. */
export function reviewsFromDay(through: string, now: Date): string {
  const today = now.toISOString().slice(0, 10);
  return through ? dayBefore(through, OVERLAP_DAYS) : dayBefore(today, FIRST_RUN_DAYS);
}

export async function syncAppleReviews(api: AscClient, appId: string, through: string, now: Date) {
  const fromDay = reviewsFromDay(through, now);
  const toDay = now.toISOString().slice(0, 10);
  const query = new URLSearchParams({
    sort: '-createdDate',
    limit: '200',
    'fields[customerReviews]': 'rating,createdDate',
  });
  const reviews: AppleReview[] = [];
  let next: string | undefined = `/apps/${appId}/customerReviews?${query}`;
  let pages = 0;
  while (next) {
    const page = await api.get(next);
    pages += 1;
    const items = Array.isArray(page.data) ? page.data : [];
    let reachedOlder = false;
    for (const item of items) {
      const createdDate = String(item.attributes?.createdDate ?? '');
      if (createdDate.slice(0, 10) < fromDay) {
        reachedOlder = true;
        continue;
      }
      reviews.push({ rating: Number(item.attributes?.rating ?? 0), createdDate });
    }
    next = reachedOlder ? undefined : page.links?.next;
  }
  const rows = await replaceMetrics(
    { store: STORE, dimension: 'TOTAL', owns: APPLE_REVIEW_OWNS, fromDay, toDay },
    countAppleReviews(reviews)
  );
  await AppInsightStateModel.updateOne({ store: STORE }, { $set: { reviews_through: toDay } });
  return { rows, reviews: reviews.length, pages };
}
