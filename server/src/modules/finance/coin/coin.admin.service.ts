import { Types } from 'mongoose';
import { CoinBalanceModel, CoinTransactionModel, type ICoinTransaction } from './coin.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

/**
 * Platform-wide reads over the coin ledger for Admin > Duncit Coin. Kept apart
 * from coin.service.ts so the payment-critical credit/redeem path stays a small
 * file with one job. Nothing here writes.
 *
 * A coin row carries a `payment_id`, not a pod — the pod is one hop away on the
 * Payment. Resolving it per page (rather than denormalising a pod_id onto the
 * ledger) is what keeps historical rows attributed: a denormalised column would
 * only ever be populated for rows written after it shipped.
 *
 * There are TWO hops, not one, because a shop payment stores `pod_id: null` and
 * puts the pod on each ProductOrder it fans out into (a unified cart groups its
 * lines by pod, so one payment can touch several). Coins are credited on every
 * paid path, shop included, so following only Payment.pod_id would leave every
 * shop order's coins looking like they came from no pod at all.
 */

/** Sums a field only for ledger rows of one type — the shape both aggregates use. */
const sumOfType = (type: 'CREDIT' | 'DEBIT') => ({
  $sum: { $cond: [{ $eq: ['$type', type] }, '$amount', 0] },
});

/** Allowlists for the shared table engine (coinTransactionsTable — DUNCIT TABLE
 * CONTRACT v1). Only fields that physically exist on the ledger row belong
 * here: the buyer name and the pod title are joined AFTER the page is fetched,
 * so offering them as sort or search keys would silently do nothing. */
const COIN_TXN_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['payment_id', 'reason'],
  sortFields: {
    created_at: 'created_at',
    amount: 'amount',
    balance_after: 'balance_after',
    type: 'type',
    source: 'source',
  },
  filterFields: {
    type: { type: 'enum' },
    source: { type: 'enum' },
    amount: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

interface PaymentInfo {
  /** The Payment's own _id — what a ProductOrder references. */
  doc_id: string;
  pod_ids: string[];
  user_name: string;
  user_email: string;
  total: number;
}

interface PodInfo {
  id: string;
  title: string;
  slug: string;
}

/** UTC 'YYYY-MM' keys for the last `span` months, oldest first. */
function monthKeys(span: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let back = span - 1; back >= 0; back -= 1) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const mm = String(month.getUTCMonth() + 1).padStart(2, '0');
    keys.push(`${month.getUTCFullYear()}-${mm}`);
  }
  return keys;
}

/** Scope the ledger to one pod by way of that pod's payments — both the pod
 * tickets billed straight to it and the shop orders that fanned out to it. An
 * unknown pod yields `$in: []`, which correctly matches nothing. */
async function podScopeFilter(podDocId?: string | null): Promise<Record<string, unknown>> {
  if (!podDocId || !Types.ObjectId.isValid(podDocId)) return {};
  const podId = new Types.ObjectId(podDocId);
  const [ticketPaymentIds, orderPaymentDocIds] = await Promise.all([
    PaymentModel.distinct('payment_id', { pod_id: podId }),
    ProductOrderModel.distinct('payment_id', { pod_id: podId }),
  ]);
  const shopPaymentIds = orderPaymentDocIds.length
    ? await PaymentModel.distinct('payment_id', { _id: { $in: orderPaymentDocIds } })
    : [];
  return { payment_id: { $in: [...new Set([...ticketPaymentIds, ...shopPaymentIds])] } };
}

/** Pod ids per Payment `_id`, for the shop payments that carry none themselves. */
async function loadShopPodIds(paymentDocIds: string[]): Promise<Map<string, string[]>> {
  if (paymentDocIds.length === 0) return new Map();
  const orders = await ProductOrderModel.find({ payment_id: { $in: paymentDocIds } })
    .select('payment_id pod_id')
    .lean();
  const byPayment = new Map<string, string[]>();
  for (const order of orders as any[]) {
    if (!order.pod_id) continue;
    const key = String(order.payment_id);
    byPayment.set(key, [...(byPayment.get(key) ?? []), String(order.pod_id)]);
  }
  return byPayment;
}

async function loadPaymentMap(paymentIds: string[]): Promise<Map<string, PaymentInfo>> {
  if (paymentIds.length === 0) return new Map();
  const rows = await PaymentModel.find({ payment_id: { $in: paymentIds } })
    .select('payment_id pod_id user_name user_email total')
    .lean();
  // A shop payment stores no pod of its own; its pods live on the orders it
  // created, so those are looked up for exactly the payments that need it.
  const shopDocIds = rows.filter((p: any) => !p.pod_id).map((p: any) => String(p._id));
  const shopPods = await loadShopPodIds(shopDocIds);
  return new Map(
    rows.map((p: any) => {
      const docId = String(p._id);
      const podIds = p.pod_id ? [String(p.pod_id)] : shopPods.get(docId) ?? [];
      return [
        p.payment_id as string,
        {
          doc_id: docId,
          pod_ids: [...new Set(podIds)],
          user_name: p.user_name ?? '',
          user_email: p.user_email ?? '',
          total: p.total ?? 0,
        },
      ];
    })
  );
}

/** `includeDeleted` is load-bearing: a coin row for a since-cancelled pod is
 * still a real ledger row and must render its pod, not a blank. */
async function loadPodMap(podIds: string[]): Promise<Map<string, PodInfo>> {
  if (podIds.length === 0) return new Map();
  const rows = await PodModel.find({ _id: { $in: podIds } })
    .select('pod_title pod_id')
    .setOptions({ includeDeleted: true })
    .lean();
  return new Map(
    rows.map((p: any) => [
      String(p._id),
      { id: String(p._id), title: p.pod_title ?? '', slug: p.pod_id ?? '' },
    ])
  );
}

const toAdminRow = (
  t: ICoinTransaction,
  payments: Map<string, PaymentInfo>,
  pods: Map<string, PodInfo>
) => {
  const payment = t.payment_id ? payments.get(t.payment_id) : undefined;
  const rowPods = (payment?.pod_ids ?? [])
    .map((id) => pods.get(id))
    .filter((pod): pod is PodInfo => !!pod);
  return {
    id: t._id.toString(),
    user_id: String(t.user_id),
    user_name: payment?.user_name ?? '',
    user_email: payment?.user_email ?? '',
    type: t.type,
    amount: t.amount,
    balance_after: t.balance_after,
    source: t.source,
    reason: t.reason ?? '',
    payment_id: t.payment_id ?? null,
    payment_total: payment?.total ?? 0,
    pods: rowPods,
    earn_pct: t.earn_pct ?? 0,
    spend_amount: t.spend_amount ?? 0,
    created_at: t.created_at?.toISOString?.() ?? '',
  };
};

export const coinAdminService = {
  /**
   * The platform coin position. Circulated and redeemed are read from the
   * ledger — the insert-only source of truth — and outstanding is their
   * difference, so the three headline numbers can never disagree with each
   * other. The CoinBalance total rides along separately as a cross-check.
   */
  async stats(months?: number | null) {
    const span = Math.min(36, Math.max(1, Math.trunc(months ?? 12)));
    const keys = monthKeys(span);
    const from = new Date(`${keys[0]}-01T00:00:00.000Z`);

    const [totals, buckets, balances, earnPct, finance] = await Promise.all([
      CoinTransactionModel.aggregate([
        {
          $group: {
            _id: null,
            circulated: sumOfType('CREDIT'),
            redeemed: sumOfType('DEBIT'),
            count: { $sum: 1 },
          },
        },
      ]),
      CoinTransactionModel.aggregate([
        { $match: { created_at: { $gte: from } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$created_at', timezone: 'UTC' } },
            earned: sumOfType('CREDIT'),
            redeemed: sumOfType('DEBIT'),
          },
        },
      ]),
      CoinBalanceModel.aggregate([
        {
          $group: {
            _id: null,
            balance: { $sum: '$balance' },
            holders: { $sum: { $cond: [{ $gt: ['$balance', 0] }, 1, 0] } },
          },
        },
      ]),
      settingsService.getCoinEarnPct(),
      getFinanceSettings(),
    ]);

    const circulated = totals[0]?.circulated ?? 0;
    const redeemed = totals[0]?.redeemed ?? 0;
    const byMonth = new Map<string, { earned: number; redeemed: number }>(
      buckets.map((b: any) => [b._id as string, { earned: b.earned ?? 0, redeemed: b.redeemed ?? 0 }])
    );

    return {
      total_circulated: circulated,
      total_redeemed: redeemed,
      total_outstanding: circulated - redeemed,
      wallet_balance_total: balances[0]?.balance ?? 0,
      transaction_count: totals[0]?.count ?? 0,
      holders_count: balances[0]?.holders ?? 0,
      earn_pct: earnPct,
      currency_symbol: finance.currency_symbol,
      // Every month in the window is emitted, so a quiet month reads as a zero
      // bar rather than vanishing and compressing the timeline.
      monthly: keys.map((month) => ({
        month,
        earned: byMonth.get(month)?.earned ?? 0,
        redeemed: byMonth.get(month)?.redeemed ?? 0,
      })),
    };
  },

  /**
   * One page of the coin ledger, each row carrying who spent/earned and on
   * which pod. The pod scope is a base filter rather than a table filter
   * because `pod_id` is not a field on the ledger — running it through the
   * engine's allowlist would silently drop it.
   */
  async table(input?: TableQueryInput | null, podDocId?: string | null) {
    const baseFilter = await podScopeFilter(podDocId);
    const { docs, total, page, page_size } = await runTableQuery<ICoinTransaction>(
      CoinTransactionModel,
      baseFilter,
      input,
      COIN_TXN_TABLE_CONFIG
    );
    const paymentIds = docs.map((d) => d.payment_id).filter((id): id is string => !!id);
    const payments = await loadPaymentMap(paymentIds);
    const podIds = [...payments.values()].flatMap((p) => p.pod_ids);
    const pods = await loadPodMap([...new Set(podIds)]);
    return { rows: docs.map((d) => toAdminRow(d, payments, pods)), total, page, page_size };
  },
};
