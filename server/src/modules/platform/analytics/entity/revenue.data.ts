import type { Types } from 'mongoose';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { PaymentReleaseModel } from '@modules/finance/finance/paymentRelease.model';
import { SETTLEMENT_ENGINE_VERSION } from '@modules/finance/finance/settlement.service';
import { WalletModel, WalletWithdrawalModel } from '@modules/finance/wallet/wallet.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { refKey } from './lookups';
import { dayKeyExpr, inRange } from './window';
import type { Keyed } from './aggregates';

/**
 * Everything Analytics > Money > Revenue & Finance reads, straight from the
 * ledgers Finance works in. Payments, releases, wallets and withdrawals all
 * store rupees — the settlement engine works in paise only internally and
 * converts back before it writes — so no amount here needs converting.
 */

/** A payment that took money. A refunded one did too, before it was given back. */
export const CAPTURED = ['SUCCESS', 'REFUNDED'];
const IS_CAPTURED = { $in: ['$status', CAPTURED] };
const WITH_OUTCOME = { $in: [...CAPTURED, 'FAILED'] };

/** What a refund returned: the figure its writer recorded, else the whole payment — an admin refund records none. */
const REFUND_AMOUNT = {
  $convert: { input: '$metadata.refunded_amount', to: 'double', onError: '$total', onNull: '$total' },
};
const IS_REFUNDED = { $ne: [{ $ifNull: ['$metadata.refunded_at', null] }, null] };

/** Every refund flow stamps `metadata.refunded_at` as an ISO string, which orders chronologically as text. */
const refundedIn = (from: Date, to: Date) => ({
  'metadata.refunded_at': { $gte: from.toISOString(), $lt: to.toISOString() },
});

/**
 * Duncit's cut of a settled pod, read exactly as Finance > Dashboard reads it:
 * current settlements stamp the pod-level total on the host's release, older
 * ones only carried the host-side share. Other release kinds carry none.
 */
const SETTLED_SHARE = {
  $cond: [
    { $gte: ['$breakdown.version', SETTLEMENT_ENGINE_VERSION] },
    { $ifNull: ['$breakdown.duncit_revenue', 0] },
    { $ifNull: ['$breakdown.duncit_amount', 0] },
  ],
};
const DUNCIT_SHARE = { $cond: [{ $eq: ['$kind', 'HOST_PAYMENT'] }, SETTLED_SHARE, 0] };

/** The same groupings serve a period's totals (`_id: null`) and its per-day trend (`_id` = day). */
const moneyGroup = (id: unknown) => ({
  $group: {
    _id: id,
    collected: { $sum: { $cond: [IS_CAPTURED, '$total', 0] } },
    gst: { $sum: { $cond: [IS_CAPTURED, '$gst_amount', 0] } },
    captured: { $sum: { $cond: [IS_CAPTURED, 1, 0] } },
    failed: { $sum: { $cond: [IS_CAPTURED, 0, 1] } },
  },
});
const refundGroup = (id: unknown) => ({ $group: { _id: id, amount: { $sum: REFUND_AMOUNT }, count: { $sum: 1 } } });
// A part-approved release pays what the reviewer approved, not what was asked.
const releaseGroup = (id: unknown) => ({
  $group: { _id: id, released: { $sum: { $ifNull: ['$approved_amount', '$amount_requested'] } }, duncit: { $sum: DUNCIT_SHARE } },
});

interface Money { collected: number; gst: number; captured: number; failed: number }
interface SumRow { amount: number; count: number }
interface Released { released: number; duncit: number }

const firstSum = (rows: SumRow[]) => rows[0] ?? { amount: 0, count: 0 };
const sumOf = <K extends string>(rows: ReadonlyArray<Record<K, number>>, field: K) =>
  Math.round(rows.reduce((sum, row) => sum + row[field], 0));

export interface RevenuePeriod extends Money, Released {
  payers: number;
  refunded: number;
  refunds: number;
  /** Money released per release kind (host, venue, club admin, brand). */
  byKind: Map<string, number>;
}

/** Each tile's raw totals for one period — loaded identically for the period before. */
export async function loadRevenuePeriod(from: Date, to: Date): Promise<RevenuePeriod> {
  const created = inRange(from, to);
  const [money, payers, refunds, releases] = await Promise.all([
    PaymentModel.aggregate<Money>([{ $match: { status: WITH_OUTCOME, created_at: created } }, moneyGroup(null)]),
    // A pet-store guest has no account, so their email stands in for the payer.
    PaymentModel.aggregate<{ n: number }>([
      { $match: { status: { $in: CAPTURED }, created_at: created } },
      { $group: { _id: { $ifNull: ['$user_id', '$user_email'] } } },
      { $count: 'n' },
    ]),
    PaymentModel.aggregate<SumRow>([{ $match: refundedIn(from, to) }, refundGroup(null)]),
    PaymentReleaseModel.aggregate<Keyed & Released>([
      { $match: { status: 'APPROVED', reviewed_at: created } },
      releaseGroup('$kind'),
    ]),
  ]);
  const totals = money[0] ?? { collected: 0, gst: 0, captured: 0, failed: 0 };
  const refund = firstSum(refunds);
  return {
    collected: Math.round(totals.collected),
    gst: Math.round(totals.gst),
    captured: totals.captured,
    failed: totals.failed,
    payers: payers[0]?.n ?? 0,
    refunded: Math.round(refund.amount),
    refunds: refund.count,
    released: sumOf(releases, 'released'),
    duncit: sumOf(releases, 'duncit'),
    byKind: new Map(releases.map((row) => [row._id, Math.round(row.released)])),
  };
}

/** Money owed to partners right now, by where it is waiting. */
export async function loadPayoutsOwed() {
  const owed = (sum: string) => ({ $group: { _id: null, amount: { $sum: sum }, count: { $sum: 1 } } });
  const [releases, wallets, withdrawals] = await Promise.all([
    PaymentReleaseModel.aggregate<SumRow>([{ $match: { status: 'PENDING' } }, owed('$amount_requested')]),
    WalletModel.aggregate<SumRow>([{ $match: { balance: { $gt: 0 } } }, owed('$balance')]),
    WalletWithdrawalModel.aggregate<SumRow>([{ $match: { status: 'PENDING' } }, owed('$amount')]),
  ]);
  return {
    releases_pending: Math.round(firstSum(releases).amount),
    wallet_balance: Math.round(firstSum(wallets).amount),
    withdrawals_pending: Math.round(firstSum(withdrawals).amount),
  };
}

/** Per-day totals for the trends, in the admin's time zone. */
export async function loadRevenueDays(from: Date, to: Date, zone: string) {
  const range = inRange(from, to);
  const refundDay = {
    $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$metadata.refunded_at' }, timezone: zone },
  };
  const [payments, refunds, releases, withdrawals] = await Promise.all([
    PaymentModel.aggregate<Keyed & Money>([
      { $match: { status: WITH_OUTCOME, created_at: range } },
      moneyGroup(dayKeyExpr('created_at', zone)),
    ]),
    PaymentModel.aggregate<Keyed & SumRow>([{ $match: refundedIn(from, to) }, refundGroup(refundDay)]),
    PaymentReleaseModel.aggregate<Keyed & Released>([
      { $match: { status: 'APPROVED', reviewed_at: range } },
      releaseGroup(dayKeyExpr('reviewed_at', zone)),
    ]),
    WalletWithdrawalModel.aggregate<Keyed & { amount: number }>([
      { $match: { status: 'PAID', paid_at: range } },
      { $group: { _id: dayKeyExpr('paid_at', zone), amount: { $sum: '$amount' } } },
    ]),
  ]);
  return { payments, refunds, releases, withdrawals };
}

/** Captured payments per gateway and per thing bought — a handful of rows. */
export const loadPaymentMix = (from: Date, to: Date) =>
  PaymentModel.aggregate<{ _id: { gateway: string | null; target: string | null }; count: number; amount: number }>([
    { $match: { status: { $in: CAPTURED }, created_at: inRange(from, to) } },
    { $group: { _id: { gateway: '$gateway', target: '$target_type' }, count: { $sum: 1 }, amount: { $sum: '$total' } } },
  ]);

export interface PodMoney { _id: Types.ObjectId; collected: number; payments: number; refunded: number }

/**
 * Pod-ticket money per pod. Only tickets name a pod on the payment — a shop
 * payment files its pods on the orders it fans out into, and a gift card has
 * none — so the city, category and pod views read tickets alone.
 */
export const loadPodMoney = (from: Date, to: Date) =>
  PaymentModel.aggregate<PodMoney>([
    { $match: { status: { $in: CAPTURED }, created_at: inRange(from, to), target_type: 'POD', pod_id: { $ne: null } } },
    {
      $group: {
        _id: '$pod_id',
        collected: { $sum: '$total' },
        payments: { $sum: 1 },
        refunded: { $sum: { $cond: [IS_REFUNDED, REFUND_AMOUNT, 0] } },
      },
    },
  ]);

type Ref = Types.ObjectId | null;
interface PodRef { _id: Types.ObjectId; pod_title?: string; club_id: Types.ObjectId; location_id?: Ref }
interface ClubRef { _id: Types.ObjectId; category_id?: Ref; location_id?: Ref }

/** Title, city and category of the pods behind the money — a cancelled pod's takings still count, so deleted pods are read too. */
export async function podPlaces(rows: readonly PodMoney[]) {
  const pods = await PodModel.find({ _id: { $in: rows.map((row) => row._id) } })
    .select('pod_title club_id location_id')
    .setOptions({ includeDeleted: true })
    .lean<PodRef[]>();
  const clubs = await ClubModel.find({ _id: { $in: pods.map((pod) => pod.club_id) } })
    .select('category_id location_id')
    .lean<ClubRef[]>();
  const podById = new Map(pods.map((pod) => [pod._id.toHexString(), pod]));
  const clubById = new Map(clubs.map((club) => [club._id.toHexString(), club]));
  const clubOf = (podId: string) => clubById.get(podById.get(podId)?.club_id.toHexString() ?? '');
  return {
    titleOf: (podId: string) => podById.get(podId)?.pod_title ?? '',
    // A pod's own city wins; an online pod has none and reads its club's.
    cityOf: (podId: string) => refKey(podById.get(podId)?.location_id ?? clubOf(podId)?.location_id),
    categoryOf: (podId: string) => refKey(clubOf(podId)?.category_id),
  };
}
