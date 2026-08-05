import { Types } from 'mongoose';
import {
  BouncerFeedbackModel,
  FEEDBACK_ASPECTS,
  type BouncerFeedbackAspect,
  type BouncerFeedbackCategory,
  type IBouncerAspectRating,
} from './bouncer.model';
import { ClubModel } from '@modules/clubs/club/club.model';

/**
 * Rating a pod is not one question. A guest can love the evening and still have
 * been let down by the room, the food or the person running it — so each part
 * is scored on its own, and this module owns which parts a given pod even HAS.
 *
 * The rule lives here, once, because the app, mWeb and the admin panel all have
 * to agree on it: a virtual pod has no room to rate and no food to eat, and a
 * club with no admin should not be scored on one.
 */

interface AspectPod {
  _id: Types.ObjectId;
  venue_id?: Types.ObjectId | null;
  club_id?: Types.ObjectId | null;
  pod_mode?: string | null;
  pod_hosts_id?: Types.ObjectId[] | null;
}

/** Always asked: every pod has an evening, a host, a duty of care, and a catch-all. */
const ALWAYS: BouncerFeedbackAspect[] = ['OVERALL', 'HOST', 'SAFETY', 'OTHER'];

/**
 * The aspects this pod can be rated on, in the order they are asked. VENUE and
 * FOOD need somewhere physical to happen; CLUB_ADMIN needs a club admin who is
 * not simply the host wearing a second hat.
 */
export async function aspectsForPod(pod: AspectPod): Promise<BouncerFeedbackAspect[]> {
  const physical = (pod.pod_mode ?? 'PHYSICAL') !== 'VIRTUAL';
  const applicable = new Set<BouncerFeedbackAspect>(ALWAYS);
  if (physical && pod.venue_id) {
    applicable.add('VENUE');
    applicable.add('FOOD');
  }
  if (await hasSeparateClubAdmin(pod)) applicable.add('CLUB_ADMIN');
  // FEEDBACK_ASPECTS is the asking order; the set only decides membership.
  return FEEDBACK_ASPECTS.filter((aspect) => applicable.has(aspect));
}

async function hasSeparateClubAdmin(pod: AspectPod): Promise<boolean> {
  if (!pod.club_id) return false;
  const club = await ClubModel.findById(pod.club_id).select('admin_user_ids').lean();
  const admins = club?.admin_user_ids ?? [];
  if (admins.length === 0) return false;
  const hosts = new Set((pod.pod_hosts_id ?? []).map(String));
  return admins.some((admin) => !hosts.has(String(admin)));
}

/**
 * What the guest sent, made safe to store: only aspects this pod has, scores
 * inside 1-5, one entry per aspect, and OVERALL removed — that one lives on
 * `rating`, and two copies of the same number is one copy too many.
 */
export function normalizeRatings(
  sent: ReadonlyArray<{ aspect: string; rating: number }> | null | undefined,
  allowed: ReadonlyArray<BouncerFeedbackAspect>
): IBouncerAspectRating[] {
  const permitted = new Set<string>(allowed);
  const seen = new Set<string>();
  const out: IBouncerAspectRating[] = [];
  for (const entry of sent ?? []) {
    const aspect = entry.aspect as BouncerFeedbackAspect;
    if (aspect === 'OVERALL' || !permitted.has(aspect) || seen.has(aspect)) continue;
    if (!Number.isFinite(entry.rating) || entry.rating < 1 || entry.rating > 5) continue;
    seen.add(aspect);
    out.push({ aspect, rating: Math.round(entry.rating) });
  }
  return out;
}

/** Aspects that name a category an agent can triage by. */
const CATEGORY_OF: Partial<Record<BouncerFeedbackAspect, BouncerFeedbackCategory>> = {
  HOST: 'HOST',
  VENUE: 'VENUE',
  SAFETY: 'SAFETY',
  FOOD: 'FOOD',
  CLUB_ADMIN: 'CLUB_ADMIN',
};

/**
 * What the feedback is ABOUT, without asking a second question: the part that
 * scored worst. A guest who gave everything five stars is not complaining about
 * anything, so that reads as OTHER.
 */
export function deriveCategory(ratings: ReadonlyArray<IBouncerAspectRating>): BouncerFeedbackCategory {
  let worst: IBouncerAspectRating | null = null;
  for (const entry of ratings) {
    if (entry.rating >= 4) continue;
    if (!worst || entry.rating < worst.rating) worst = entry;
  }
  if (!worst) return 'OTHER';
  return CATEGORY_OF[worst.aspect] ?? 'OTHER';
}

export interface AspectSummary {
  aspect: BouncerFeedbackAspect;
  average: number;
  count: number;
}

export interface FeedbackSummary {
  total: number;
  overall_average: number;
  aspects: AspectSummary[];
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Averages per aspect for a set of feedback rows, in the asking order. */
export function summarize(
  rows: ReadonlyArray<{ rating: number; ratings?: ReadonlyArray<IBouncerAspectRating> | null }>
): FeedbackSummary {
  const totals = new Map<BouncerFeedbackAspect, { sum: number; count: number }>();
  const add = (aspect: BouncerFeedbackAspect, rating: number) => {
    const bucket = totals.get(aspect) ?? { sum: 0, count: 0 };
    bucket.sum += rating;
    bucket.count += 1;
    totals.set(aspect, bucket);
  };

  for (const row of rows) {
    add('OVERALL', row.rating);
    for (const entry of row.ratings ?? []) add(entry.aspect, entry.rating);
  }

  const aspects: AspectSummary[] = [];
  for (const aspect of FEEDBACK_ASPECTS) {
    const bucket = totals.get(aspect);
    if (bucket) aspects.push({ aspect, average: round1(bucket.sum / bucket.count), count: bucket.count });
  }
  const overall = totals.get('OVERALL');

  return {
    total: rows.length,
    overall_average: overall ? round1(overall.sum / overall.count) : 0,
    aspects,
  };
}

/** Every rating left on one pod, rolled up. */
export async function summarizeForPod(podId: string): Promise<FeedbackSummary> {
  const rows = await BouncerFeedbackModel.find({ pod_id: new Types.ObjectId(podId) })
    .select('rating ratings')
    .lean();
  return summarize(rows as Array<{ rating: number; ratings?: IBouncerAspectRating[] }>);
}
