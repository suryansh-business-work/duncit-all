import type { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { loadUserMap, monthKeys } from '@utils/admin-ledger';
import { SmartIncentiveOfferModel } from './smartIncentive.model';
import { smartIncentiveSettingsService } from './smartIncentive.settings.service';

/**
 * Loyalty > Smart Incentive > Dashboard: who opted in and at what discount,
 * how many offers the pod pages showed and how many of them turned into a
 * booking, and what it cost the hosts. Nothing here writes; every figure is
 * read from where it happened — the pods, the offers and the payments.
 */

interface OptedInPod {
  _id: Types.ObjectId;
  pod_hosts_id?: Types.ObjectId[] | null;
  smart_incentive_pct?: number | null;
  pod_date_time?: Date | null;
}

interface PodBookings {
  _id: Types.ObjectId | null;
  bookings: number;
  discount: number;
}

interface MonthRow {
  _id: string;
  count: number;
  discount?: number;
}

/** How many hosts the dashboard ranks. */
const TOP_HOSTS = 10;

/** SUCCESS bookings that took an unlocked offer — the conversions. */
const INCENTIVE_BOOKINGS = { status: 'SUCCESS', smart_incentive_amount: { $gt: 0 } } as const;

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const percent = (part: number, whole: number) => (whole > 0 ? round1((part / whole) * 100) : 0);
const average = (values: readonly number[]) =>
  values.length > 0 ? round1(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;

const byMonth = { $dateToString: { format: '%Y-%m', date: '$created_at', timezone: 'UTC' } };

/** The host who created a pod — the one who chose its discount. */
const primaryHost = (pod: OptedInPod) => (pod.pod_hosts_id?.[0] ? String(pod.pod_hosts_id[0]) : '');

/** Opted-in pods per discount, smallest discount first — the doughnut's slices. */
function discountSplit(pods: readonly OptedInPod[]) {
  const counts = new Map<number, number>();
  for (const pod of pods) {
    const pct = Number(pod.smart_incentive_pct) || 0;
    counts.set(pct, (counts.get(pct) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a - b).map(([discount_pct, count]) => ({ discount_pct, pods: count }));
}

interface HostTally {
  pods: number;
  pcts: number[];
  bookings: number;
  discount: number;
}

/** Per host: the pods they opted in, the discounts they chose, and what those pods converted. */
function tallyHosts(pods: readonly OptedInPod[], bookingsByPod: ReadonlyMap<string, PodBookings>) {
  const byHost = new Map<string, HostTally>();
  for (const pod of pods) {
    const host = primaryHost(pod);
    if (!host) continue;
    const entry = byHost.get(host) ?? { pods: 0, pcts: [], bookings: 0, discount: 0 };
    const sold = bookingsByPod.get(String(pod._id));
    entry.pods += 1;
    entry.pcts.push(Number(pod.smart_incentive_pct) || 0);
    entry.bookings += sold?.bookings ?? 0;
    entry.discount += sold?.discount ?? 0;
    byHost.set(host, entry);
  }
  return byHost;
}

/** The hosts with the most opted-in pods, then the most conversions. */
async function topHosts(tallies: ReadonlyMap<string, HostTally>) {
  const ranked = [...tallies.entries()]
    .sort(([, a], [, b]) => b.pods - a.pods || b.bookings - a.bookings)
    .slice(0, TOP_HOSTS);
  const users = await loadUserMap(ranked.map(([id]) => id));
  return ranked.map(([id, tally]) => ({
    user_id: id,
    name: users.get(id)?.name ?? '',
    email: users.get(id)?.email ?? '',
    pods: tally.pods,
    avg_discount_pct: average(tally.pcts),
    bookings: tally.bookings,
    discount_given: round2(tally.discount),
  }));
}

/** Every month of the window, a quiet one reading as zeros. */
function monthlySeries(keys: readonly string[], offers: readonly MonthRow[], bookings: readonly MonthRow[]) {
  const offersOf = new Map(offers.map((row) => [row._id, row.count]));
  const bookingsOf = new Map(bookings.map((row) => [row._id, row]));
  return keys.map((month) => ({
    month,
    offers: offersOf.get(month) ?? 0,
    bookings: bookingsOf.get(month)?.count ?? 0,
    discount: round2(bookingsOf.get(month)?.discount ?? 0),
  }));
}

export const smartIncentiveAdminService = {
  /**
   * The whole programme on one page. Totals are all-time; `months` bounds
   * only the month-by-month series. "Opted in" counts a pod's creating host,
   * the one who chose its discount; cancelled pods are left out.
   */
  async stats(months?: number | null) {
    const span = Math.min(36, Math.max(1, Math.trunc(months ?? 12)));
    const keys = monthKeys(span);
    const from = new Date(`${keys[0]}-01T00:00:00.000Z`);

    const [settings, pods, offersShown, offerMonths, bookingsPerPod, bookingMonths] = await Promise.all([
      smartIncentiveSettingsService.get(),
      PodModel.find({ smart_incentive_enabled: true })
        .select('pod_hosts_id smart_incentive_pct pod_date_time')
        .lean<OptedInPod[]>(),
      SmartIncentiveOfferModel.countDocuments(),
      SmartIncentiveOfferModel.aggregate<MonthRow>([
        { $match: { created_at: { $gte: from } } },
        { $group: { _id: byMonth, count: { $sum: 1 } } },
      ]),
      PaymentModel.aggregate<PodBookings>([
        { $match: INCENTIVE_BOOKINGS },
        { $group: { _id: '$pod_id', bookings: { $sum: 1 }, discount: { $sum: '$smart_incentive_amount' } } },
      ]),
      PaymentModel.aggregate<MonthRow>([
        { $match: { ...INCENTIVE_BOOKINGS, created_at: { $gte: from } } },
        { $group: { _id: byMonth, count: { $sum: 1 }, discount: { $sum: '$smart_incentive_amount' } } },
      ]),
    ]);

    const bookingsByPod = new Map(bookingsPerPod.map((row) => [String(row._id), row]));
    const bookings = bookingsPerPod.reduce((sum, row) => sum + row.bookings, 0);
    const discountGiven = bookingsPerPod.reduce((sum, row) => sum + row.discount, 0);
    const now = Date.now();
    const tallies = tallyHosts(pods, bookingsByPod);

    return {
      enabled: settings.enabled,
      max_discount_pct: settings.max_discount_pct,
      delay_seconds: settings.delay_seconds,
      hosts_opted_in: tallies.size,
      pods_opted_in: pods.length,
      upcoming_pods: pods.filter((pod) => pod.pod_date_time && new Date(pod.pod_date_time).getTime() > now).length,
      avg_discount_pct: average(pods.map((pod) => Number(pod.smart_incentive_pct) || 0)),
      offers_shown: offersShown,
      bookings,
      conversion_pct: percent(bookings, offersShown),
      discount_given: round2(discountGiven),
      monthly: monthlySeries(keys, offerMonths, bookingMonths),
      discount_split: discountSplit(pods),
      top_hosts: await topHosts(tallies),
    };
  },
};
