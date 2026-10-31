import { Types } from 'mongoose';
import { POD_VISIBLE_FILTER } from '@utils/hidden';
import { escapeRegExp } from '@utils/regex';
import { PodModel } from '@modules/pods/pod/pod.model';
import { podRowStatusFilter } from '@modules/pods/pod/pod.rowStatus';
import { ClubModel } from '@modules/clubs/club/club.model';
import type { PodPromoSettingsDoc } from './podPromo.model';
import { MIN_LEAD_MS } from './podPromo.schedule';

/**
 * Which pods may be promoted: published (ACTIVE — live, not a draft, not
 * awaiting or refused by its venue, not settled or cancelled), visible to
 * members (not hidden on their own or with their club), upcoming, and inside
 * the settings' filters. The same predicate serves the planner, the pod
 * picker and the preview's "would the planner promote this" answer.
 */
const DAY_MS = 86_400_000;
/** A few days past the slot window, so a pod whose slot falls due before the next tick is not missed. */
const LOOKAHEAD_SLACK_DAYS = 3;
const CANDIDATE_LIMIT = 50;
/** How many upcoming pods one tick looks at; already-promoted ones are dropped after. */
const PLANNER_SCAN_LIMIT = 300;

type Filters = Pick<PodPromoSettingsDoc, 'city_ids' | 'club_ids' | 'category_ids' | 'price_filter' | 'min_days_until_start' | 'days_before'>;

const oids = (ids: readonly string[]) => ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));

/** The clubs the filters allow, or null when they do not narrow by club at all. */
async function allowedClubs(filters: Filters): Promise<Types.ObjectId[] | null> {
  const byClub = filters.club_ids.length > 0 ? oids(filters.club_ids) : null;
  if (filters.category_ids.length === 0) return byClub;
  const categories = oids(filters.category_ids);
  const inCategory = await ClubModel.find({ $or: [{ category_id: { $in: categories } }, { super_category_id: { $in: categories } }] })
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();
  const ids = inCategory.map((club) => club._id);
  if (!byClub) return ids;
  const wanted = new Set(byClub.map(String));
  return ids.filter((id) => wanted.has(String(id)));
}

function priceFilter(filter: Filters['price_filter']): Record<string, unknown> {
  if (filter === 'PAID') return { pod_type: 'PAID', pod_amount: { $gt: 0 } };
  if (filter === 'FREE') return { $or: [{ pod_type: 'FREE' }, { pod_amount: { $lte: 0 } }] };
  return {};
}

/** The pods the settings allow, starting inside `start` (bounds on pod_date_time). */
export async function eligibleFilter(filters: Filters, start: Record<string, Date>): Promise<Record<string, unknown>> {
  const clubs = await allowedClubs(filters);
  return {
    ...podRowStatusFilter('ACTIVE'),
    ...POD_VISIBLE_FILTER,
    pod_date_time: start,
    ...(filters.city_ids.length > 0 ? { location_id: { $in: oids(filters.city_ids) } } : {}),
    ...(clubs ? { club_id: { $in: clubs } } : {}),
    ...priceFilter(filters.price_filter),
  };
}

/** The earliest start the planner considers: past the minimum lead and the settings' floor. */
export const earliestStart = (filters: Filters, now: Date) => new Date(now.getTime() + Math.max(MIN_LEAD_MS, filters.min_days_until_start * DAY_MS));

/** Upcoming eligible pods whose post could fall due soon, soonest first (the planner drops those already promoted). */
export async function candidatePods(filters: Filters, now: Date): Promise<{ _id: Types.ObjectId; pod_date_time: Date }[]> {
  const latest = new Date(now.getTime() + (filters.days_before + LOOKAHEAD_SLACK_DAYS) * DAY_MS);
  const filter = await eligibleFilter(filters, { $gt: earliestStart(filters, now), $lte: latest });
  return PodModel.find(filter)
    .select('_id pod_date_time')
    .sort({ pod_date_time: 1 })
    .limit(PLANNER_SCAN_LIMIT)
    .lean<{ _id: Types.ObjectId; pod_date_time: Date }[]>();
}

/** Upcoming published public pods for the picker, whatever the filters say; search matches the title. */
export async function pickablePods(now: Date, search: string | null | undefined) {
  const text = (search ?? '').trim();
  return PodModel.find({
    ...podRowStatusFilter('ACTIVE'),
    ...POD_VISIBLE_FILTER,
    pod_date_time: { $gt: now },
    ...(text ? { pod_title: { $regex: escapeRegExp(text), $options: 'i' } } : {}),
  })
    .select('_id pod_title pod_date_time club_id')
    .sort({ pod_date_time: 1 })
    .limit(CANDIDATE_LIMIT)
    .lean<{ _id: Types.ObjectId; pod_title: string; pod_date_time: Date; club_id: Types.ObjectId }[]>();
}

/** Whether the planner would take this pod on its own under these settings. */
export async function passesFilters(podId: string, filters: Filters, now: Date): Promise<boolean> {
  const filter = await eligibleFilter(filters, { $gt: earliestStart(filters, now) });
  return (await PodModel.exists({ ...filter, _id: new Types.ObjectId(podId) })) !== null;
}
