import { Types } from 'mongoose';
import { formatInTimeZone } from 'date-fns-tz';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { TicketModel, ATTENDANCE_METHODS } from '@modules/pods/ticket/ticket.model';
import { BouncerFeedbackModel } from '@modules/support/bouncer/bouncer.model';
import { inRange, type AnalyticsWindow } from './window';
import { categoryNames, locationNames, refKey } from './lookups';
import type { HeldPod } from './held-pods';
import type { BookingRow } from './pods.data';
import {
  STAR_KEYS,
  bandSlices,
  breakdown,
  countMap,
  fixedSlices,
  pct,
  tally,
  topSlices,
  type AnalyticsBreakdown,
  type Band,
} from './shapes';

/** The Pods page's charts that split one number by something about the pod. */

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const HOURS = Array.from({ length: 24 }, (_unused, hour) => String(hour));
const FORMATS = ['PHYSICAL_PAID', 'VIRTUAL_PAID', 'VIRTUAL_FREE'] as const;
const SOURCES = ['DIRECT', 'REFERRAL', 'PAID', 'FREE', 'HOST_ADD'] as const;
const METHODS = [...ATTENDANCE_METHODS, 'UNRECORDED'] as const;

const PRICE_BANDS: Band[] = [
  { key: 'price_free', min: 0 },
  { key: 'price_under_200', min: 1 },
  { key: 'price_200_499', min: 200 },
  { key: 'price_500_999', min: 500 },
  { key: 'price_1000_plus', min: 1000 },
];

/** Fill is banded on whole percentages; a pod at or past capacity is "full". */
const FILL_BANDS: Band[] = [
  { key: 'fill_empty', min: 0 },
  { key: 'fill_1_25', min: 1 },
  { key: 'fill_26_50', min: 26 },
  { key: 'fill_51_75', min: 51 },
  { key: 'fill_76_99', min: 76 },
  { key: 'fill_full', min: 100 },
];

const HOUR_MS = 60 * 60 * 1000;
/** How far ahead a booking was made, in hours before the pod started. */
const LEAD_BANDS: Band[] = [
  { key: 'lead_same_day', min: Number.NEGATIVE_INFINITY },
  { key: 'lead_1_2_days', min: 24 },
  { key: 'lead_3_7_days', min: 72 },
  { key: 'lead_8_14_days', min: 192 },
  { key: 'lead_15_days_plus', min: 360 },
];

const fillPercent = (pod: HeldPod) => {
  if (pod.spots <= 0) return 0;
  if (pod.seats >= pod.spots) return 100;
  return Math.min(99, Math.ceil(pct(pod.seats, pod.spots)));
};

async function placeBreakdowns(held: readonly HeldPod[]) {
  const clubIds = [...new Set(held.map((pod) => pod.club_id))].map((id) => new Types.ObjectId(id));
  const clubs = await ClubModel.find({ _id: { $in: clubIds } })
    .select('category_id location_id')
    .lean<Array<{ _id: Types.ObjectId; category_id?: Types.ObjectId | null; location_id?: Types.ObjectId | null }>>();
  const clubById = new Map(clubs.map((club) => [club._id.toHexString(), club]));
  const categories = tally(held.map((pod) => refKey(clubById.get(pod.club_id)?.category_id)));
  // A pod's own city wins; an online pod has none and reads its club's.
  const cities = tally(held.map((pod) => refKey(pod.location_id ?? clubById.get(pod.club_id)?.location_id)));
  const [categoryNameMap, cityNameMap] = await Promise.all([
    categoryNames(categories.keys()),
    locationNames(cities.keys()),
  ]);
  return [
    breakdown('pods_by_category', topSlices(categories, categoryNameMap)),
    breakdown('pods_by_city', topSlices(cities, cityNameMap)),
  ];
}

async function leadTimes(bookings: readonly BookingRow[]) {
  const podIds = [...new Set(bookings.map((row) => row.pod_id.toHexString()))].map((id) => new Types.ObjectId(id));
  const pods = await PodModel.find({ _id: { $in: podIds } })
    .select('pod_date_time')
    .setOptions({ includeDeleted: true })
    .lean<Array<{ _id: Types.ObjectId; pod_date_time: Date }>>();
  const startById = new Map(pods.map((pod) => [pod._id.toHexString(), pod.pod_date_time.getTime()]));
  const hours = bookings
    .filter((row) => startById.has(row.pod_id.toHexString()))
    .map((row) => ((startById.get(row.pod_id.toHexString()) ?? 0) - row.joined_at.getTime()) / HOUR_MS);
  return bandSlices(hours, LEAD_BANDS);
}

async function doorAndScores(window: AnalyticsWindow) {
  const range = inRange(window.from, window.to);
  const [methods, stars] = await Promise.all([
    TicketModel.aggregate<{ _id: string | null; count: number }>([
      { $match: { status: 'CHECKED_IN', checked_in_at: range } },
      { $group: { _id: { $ifNull: ['$checked_in_method', 'UNRECORDED'] }, count: { $sum: 1 } } },
    ]),
    BouncerFeedbackModel.aggregate<{ _id: number; count: number }>([
      { $match: { created_at: range } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);
  return [
    breakdown('attendance_method', fixedSlices(METHODS, countMap(methods))),
    breakdown('pod_rating_stars', fixedSlices(STAR_KEYS, countMap(stars)), { ordered: true }),
  ];
}

export async function podBreakdowns(
  window: AnalyticsWindow,
  held: readonly HeldPod[],
  bookings: readonly BookingRow[]
): Promise<AnalyticsBreakdown[]> {
  const inZone = (date: Date, token: string) => formatInTimeZone(date, window.zone, token);
  // 'i' is the ISO weekday (Monday = 1), 'H' the 24-hour clock, both in the admin's zone.
  const weekdays = tally(held.map((pod) => WEEKDAYS[Number(inZone(pod.starts_at, 'i')) - 1]));
  const hours = tally(held.map((pod) => inZone(pod.starts_at, 'H')));
  const [places, lead, door] = await Promise.all([placeBreakdowns(held), leadTimes(bookings), doorAndScores(window)]);
  return [
    ...places,
    breakdown('weekday', fixedSlices(WEEKDAYS, weekdays), { ordered: true }),
    breakdown('hour_of_day', fixedSlices(HOURS, hours), { ordered: true }),
    breakdown('fill_band', bandSlices(held.map(fillPercent), FILL_BANDS), { ordered: true }),
    breakdown('price_band', bandSlices(held.map((pod) => pod.amount), PRICE_BANDS), { ordered: true }),
    breakdown('pod_format', fixedSlices(FORMATS, tally(held.map((pod) => `${pod.mode}_${pod.type}`)))),
    breakdown('lead_time', lead, { ordered: true }),
    breakdown('booking_source', fixedSlices(SOURCES, tally(bookings.map((row) => row.source ?? 'DIRECT')))),
    ...door,
  ];
}
