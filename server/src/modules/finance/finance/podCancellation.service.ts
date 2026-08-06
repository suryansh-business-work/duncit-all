import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodAuditLogModel, type IPodAuditLog } from '@modules/pods/podAudit/podAudit.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';
import { getFinanceSettings } from './finance.model';
import { podSeatsTaken } from '@modules/pods/pod/pod.seats';

/**
 * Finance → Cancel & Refunds. A "cancellation" is one of two real flows:
 * - a soft-deleted pod (host/admin/club-admin delete — the HOST path refunds
 *   every SUCCESS payment at delete time), kind from the DELETE audit source;
 * - a venue-declined pod that is still DECLINED (kind VENUE). Declines happen
 *   before the pod is publicly bookable, so these carry no attendee money.
 */
export type PodCancelKind = 'HOST' | 'VENUE' | 'ADMIN' | 'CLUB_ADMIN' | 'SYSTEM';

const KIND_BY_DELETE_SOURCE: Record<string, PodCancelKind> = {
  HOST: 'HOST',
  ADMIN: 'ADMIN',
  CLUB_ADMIN: 'CLUB_ADMIN',
  SYSTEM: 'SYSTEM',
  VENUE_OWNER: 'VENUE',
};

/** Newest cancellations hydrated per call — the client lists in memory
 * (same convention as the Pod Finance list). */
const CANCELLATION_LIMIT = 500;

export interface PodCancellationRow {
  pod_id: string;
  pod_slug: string;
  pod_title: string;
  kind: PodCancelKind;
  reason: string;
  actor_name: string;
  cancelled_at: string;
  pod_date_time: string | null;
  pod_amount: number;
  attendee_count: number;
  refunded_count: number;
  refunded_total: number;
  unrefunded_count: number;
  unrefunded_total: number;
  venue_id: string | null;
  venue_name: string | null;
  venue_amount: number;
  host_names: string[];
  club_id: string | null;
  currency_symbol: string;
}

const iso = (v?: Date | null) => (v instanceof Date ? v.toISOString() : null);

/** Latest audit entry per pod for one action (rows arrive newest-first). */
function latestByPod(audits: IPodAuditLog[], action: string): Map<string, IPodAuditLog> {
  const map = new Map<string, IPodAuditLog>();
  for (const audit of audits) {
    if (audit.action !== action) continue;
    const key = String(audit.pod_id);
    if (!map.has(key)) map.set(key, audit);
  }
  return map;
}

interface PaymentTally {
  refunded_count: number;
  refunded_total: number;
  unrefunded_count: number;
  unrefunded_total: number;
}

const EMPTY_TALLY: PaymentTally = {
  refunded_count: 0,
  refunded_total: 0,
  unrefunded_count: 0,
  unrefunded_total: 0,
};

/** REFUNDED + still-SUCCESS payment money per pod, in one aggregation. */
async function paymentTallies(podIds: string[]): Promise<Map<string, PaymentTally>> {
  const rows = await PaymentModel.aggregate([
    {
      $match: {
        pod_id: { $in: podIds.map((id) => new Types.ObjectId(id)) },
        status: { $in: ['REFUNDED', 'SUCCESS'] },
      },
    },
    {
      $group: {
        _id: { pod: '$pod_id', status: '$status' },
        count: { $sum: 1 },
        total: { $sum: '$total' },
      },
    },
  ]);
  const map = new Map<string, PaymentTally>();
  for (const row of rows) {
    const key = String(row._id.pod);
    const tally = map.get(key) ?? { ...EMPTY_TALLY };
    if (row._id.status === 'REFUNDED') {
      tally.refunded_count = row.count;
      tally.refunded_total = row.total;
    } else {
      tally.unrefunded_count = row.count;
      tally.unrefunded_total = row.total;
    }
    map.set(key, tally);
  }
  return map;
}

/** When the cancellation happened: delete stamp, else the decline audit. */
function cancelledAt(pod: any, deleted: boolean, audit: IPodAuditLog | undefined): string {
  // Deleted pods are queried with deleted_at $ne null, so the stamp is always set.
  if (deleted) return pod.deleted_at.toISOString();
  return iso(audit?.created_at ?? pod.updated_at) ?? '';
}

async function buildRows(): Promise<PodCancellationRow[]> {
  // lean(): plain DB shapes, so legacy pods keep their genuinely-missing fields.
  const [deletedPods, declinedPods, settings] = await Promise.all([
    PodModel.find({ deleted_at: { $ne: null } })
      .setOptions({ includeDeleted: true })
      .sort({ deleted_at: -1 })
      .limit(CANCELLATION_LIMIT)
      .lean(),
    PodModel.find({ deleted_at: null, venue_approval_status: 'DECLINED' })
      .sort({ updated_at: -1 })
      .limit(CANCELLATION_LIMIT)
      .lean(),
    getFinanceSettings(),
  ]);
  const pods = [...deletedPods, ...declinedPods];
  if (pods.length === 0) return [];
  const podIds = pods.map((p) => String(p._id));
  const hostIds = [...new Set(pods.flatMap((p) => (p.pod_hosts_id ?? []).map(String)))];
  const venueIds = [
    ...new Set(pods.map((p) => p.venue_id && String(p.venue_id)).filter(Boolean) as string[]),
  ];
  const slotIds = [
    ...new Set(pods.map((p) => p.venue_slot_id && String(p.venue_slot_id)).filter(Boolean) as string[]),
  ];
  const [audits, tallies, venues, hosts, slots] = await Promise.all([
    PodAuditLogModel.find({
      pod_id: { $in: podIds },
      action: { $in: ['DELETE', 'VENUE_DECLINED'] },
    }).sort({ created_at: -1, _id: -1 }),
    paymentTallies(podIds),
    VenueModel.find({ _id: { $in: venueIds } }).select('venue_name'),
    UserModel.find({ _id: { $in: hostIds } }).select('profile.first_name profile.last_name'),
    VenueSlotModel.find({ _id: { $in: slotIds } }).select('price'),
  ]);
  const deleteAudit = latestByPod(audits, 'DELETE');
  const declineAudit = latestByPod(audits, 'VENUE_DECLINED');
  const venueNameById = new Map<string, string>(venues.map((v: any) => [String(v._id), v.venue_name]));
  const priceBySlotId = new Map<string, number>(slots.map((s: any) => [String(s._id), s.price]));
  const hostNameById = new Map<string, string>(
    hosts.map((u: any) => [
      String(u._id),
      `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim(),
    ]),
  );
  // The venue's money for a cancelled pod = its booked slot price (mirrors
  // venueAmountForPod with no venue bill, batched over the whole page).
  const venueAmount = (pod: any): number => {
    if (!pod.venue_id) return 0;
    return priceBySlotId.get(String(pod.venue_slot_id)) ?? 0;
  };
  const rows: PodCancellationRow[] = [];
  for (const pod of pods) {
    const key = String(pod._id);
    const deleted = !!pod.deleted_at;
    const audit = deleted ? deleteAudit.get(key) : declineAudit.get(key);
    const kind: PodCancelKind = deleted
      ? KIND_BY_DELETE_SOURCE[audit?.source ?? ''] ?? 'SYSTEM'
      : 'VENUE';
    rows.push({
      pod_id: key,
      pod_slug: pod.pod_id,
      pod_title: pod.pod_title,
      kind,
      reason: audit?.note ?? '',
      actor_name: audit?.actor_name ?? '',
      cancelled_at: cancelledAt(pod, deleted, audit),
      pod_date_time: iso(pod.pod_date_time),
      pod_amount: pod.pod_amount ?? 0,
      attendee_count: podSeatsTaken(pod),
      ...(tallies.get(key) ?? EMPTY_TALLY),
      venue_id: pod.venue_id ? String(pod.venue_id) : null,
      venue_name: pod.venue_id ? venueNameById.get(String(pod.venue_id)) ?? null : null,
      venue_amount: venueAmount(pod),
      host_names: (pod.pod_hosts_id ?? [])
        .map((id: any) => hostNameById.get(String(id)))
        .filter(Boolean) as string[],
      club_id: pod.club_id ? String(pod.club_id) : null,
      // getFinanceSettings() hydrates the schema default, so the symbol is set.
      currency_symbol: settings.currency_symbol,
    });
  }
  rows.sort((a, b) => b.cancelled_at.localeCompare(a.cancelled_at));
  return rows;
}

export const podCancellationService = {
  /** Every cancellation, newest first; `kind` narrows to one canceller. */
  async list(kind?: PodCancelKind | null): Promise<PodCancellationRow[]> {
    const rows = await buildRows();
    if (kind) return rows.filter((row) => row.kind === kind);
    return rows;
  },

  /**
   * KPI tiles for the Cancel & Refunds dashboard. Computed over the FULL
   * collections (the list is capped for hydration; totals must not be).
   */
  async stats() {
    const [deletedIds, declinedIds, settings] = await Promise.all([
      PodModel.find({ deleted_at: { $ne: null } })
        .setOptions({ includeDeleted: true })
        .select('_id')
        .lean(),
      PodModel.find({ deleted_at: null, venue_approval_status: 'DECLINED' }).select('_id').lean(),
      getFinanceSettings(),
    ]);
    const cancelledIds = [...deletedIds, ...declinedIds].map((p) => p._id);
    const [kindRows, refundRows] = await Promise.all([
      // The latest DELETE audit per deleted pod decides who cancelled it.
      PodAuditLogModel.aggregate([
        { $match: { pod_id: { $in: deletedIds.map((p) => p._id) }, action: 'DELETE' } },
        { $sort: { created_at: -1, _id: -1 } },
        { $group: { _id: '$pod_id', source: { $first: '$source' } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      PaymentModel.aggregate([
        { $match: { pod_id: { $in: cancelledIds }, status: 'REFUNDED' } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } },
      ]),
    ]);
    const bySource = new Map<string, number>(kindRows.map((r: any) => [r._id, r.count]));
    const sourceCount = (source: string) => bySource.get(source) ?? 0;
    const audited = [...bySource.values()].reduce((sum, count) => sum + count, 0);
    // Deleted pods with no DELETE audit entry are SYSTEM cancellations.
    const unaudited = deletedIds.length - audited;
    return {
      total_cancelled: deletedIds.length + declinedIds.length,
      cancelled_by_host: sourceCount('HOST'),
      cancelled_by_venue: declinedIds.length + sourceCount('VENUE_OWNER'),
      cancelled_by_admin: sourceCount('ADMIN') + sourceCount('SYSTEM') + unaudited,
      cancelled_by_club_admin: sourceCount('CLUB_ADMIN'),
      total_refund_amount: refundRows[0]?.total ?? 0,
      refunded_payment_count: refundRows[0]?.count ?? 0,
      currency_symbol: settings.currency_symbol,
    };
  },
};
