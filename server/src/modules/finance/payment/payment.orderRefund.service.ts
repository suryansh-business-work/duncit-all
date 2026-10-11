/**
 * The read behind Finance › Pod Shop › Order Refunds and Finance › Ecomm ›
 * Order Refunds: one row per refund EVENT at order level — a cancelled order or
 * a refunded return — never one row per payment (that is User Refund Logs).
 *
 * The two shops are separate products with separate rules (rule 65), so there
 * are two pipelines and each starts from its own shop's documents. Nothing here
 * can return a pet-store row in the pod shop's list or the other way round: the
 * shop decides which collections are read and with which fixed `$match`, before
 * any client filter is applied.
 *
 * A shop's refunds live in two collections (orders and returns), so each list
 * is ONE aggregation: the order branch `$unionWith` the return branch, both
 * projected to the same row shape, then the client's filters, the sort, the
 * page and the totals — all inside MongoDB. Nothing is fetched whole and
 * sliced in memory. The union cannot be sorted off an index, so the sort runs
 * over the shop's refund events (not its orders); `allowDiskUse` covers the day
 * that set outgrows memory.
 *
 * Where the money goes is the point of the page:
 *  - `cash_amount` returns to the ORIGINAL PAYMENT METHOD (Razorpay for the
 *    pod shop, which calls the refund API; a manual Finance payout for the pet
 *    store, which never does).
 *  - `coins` return to the buyer's Duncit Coin wallet.
 *
 * Pod shop rows are read straight off the refund record `issueRefund` writes.
 * Pet-store rows are read off the refund record its cancel now writes too; an
 * order cancelled before that existed has none, so its figures are DERIVED by
 * the same rule the cancel applied (`settleCancellationMoney`) and the row says
 * so (`derived`). A derived row cannot know whether the cash was handed back as
 * coins instead — that choice was never stored on the order.
 */
import type { PipelineStage, Types } from 'mongoose';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { PodShopReturnModel } from '@modules/commerce/podShopReturn/podShopReturn.model';
import { StoreReturnModel } from '@modules/commerce/store/storeReturn.model';
import { PaymentModel } from './payment.model';
import type { PaymentShop } from './payment.source';
import {
  buildTableFilter,
  clampPage,
  resolveSort,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A refund that was actually started — the empty status is "no refund". */
const STARTED = ['PENDING', 'PROCESSED', 'RECORDED', 'FAILED'];

const orZero = (path: string) => ({ $ifNull: [path, 0] });
const orEmpty = (path: string) => ({ $ifNull: [path, ''] });

/** Allowlists for the shared table engine, over the UNIFIED row (shopOrderRefundsTable). */
const ORDER_REFUND_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['ref_no', 'order_no', 'buyer_name', 'buyer_email'],
  sortFields: {
    event_at: 'event_at',
    ref_no: 'ref_no',
    order_no: 'order_no',
    buyer_name: 'buyer_name',
    order_total: 'order_total',
    cash_amount: 'cash_amount',
    coins: 'coins',
    refund_value: 'refund_value',
    status: 'status',
    kind: 'kind',
    mode: 'mode',
  },
  filterFields: {
    kind: { type: 'enum' },
    mode: { type: 'enum' },
    status: { type: 'enum' },
    event_at: { type: 'date' },
    cash_amount: { type: 'number' },
    coins: { type: 'number' },
    manual_payout: { type: 'boolean' },
    order_no: { type: 'string' },
    buyer_name: { type: 'string' },
  },
  defaultSort: { event_at: -1 },
};

/** A pod-shop refund record (on an order or a return), as the unified row. */
const podShopRefundFields = {
  buyer_name: 1,
  buyer_email: 1,
  payment_id: 1,
  cash_amount: orZero('$refund.amount'),
  coins: orZero('$refund.coins'),
  razorpay_refund_id: orEmpty('$refund.razorpay_refund_id'),
  status: '$refund.status',
  initiated_by: orEmpty('$refund.initiated_by'),
  error: orEmpty('$refund.error'),
  derived: { $literal: false },
};

/** Pod shop: cancelled orders with a refund, then returns with a refund. */
function podShopBranches(): PipelineStage[] {
  return [
    { $match: { channel: 'POD_SHOP', 'refund.status': { $in: STARTED } } },
    {
      $project: {
        ...podShopRefundFields,
        kind: { $literal: 'CANCELLATION' },
        ref_no: '$order_no',
        order_no: 1,
        order_id: '$_id',
        order_total: '$total',
        event_at: { $ifNull: ['$refund.refunded_at', { $ifNull: ['$refund.attempted_at', '$cancelled_at'] }] },
      },
    },
    {
      $unionWith: {
        coll: PodShopReturnModel.collection.name,
        pipeline: [
          { $match: { 'refund.status': { $in: STARTED } } },
          {
            $project: {
              ...podShopRefundFields,
              kind: { $literal: 'RETURN' },
              ref_no: '$return_no',
              order_no: 1,
              order_id: 1,
              // The goods value being returned; the order's own total is read in for the page.
              order_total: orZero('$gross'),
              event_at: { $ifNull: ['$refund.refunded_at', { $ifNull: ['$refund.attempted_at', '$updated_at'] }] },
            },
          },
        ],
      },
    },
  ];
}

/** True when the pet-store order carries the refund record its cancel writes. */
const STORE_RECORDED = { $ne: [orEmpty('$refund.status'), ''] };

/** `settleCancellationMoney`'s own rule, for an order cancelled before the record existed. */
const STORE_DERIVED_CASH = {
  $cond: [
    { $eq: ['$payment_method', 'COD'] },
    0,
    {
      $max: [
        0,
        { $round: [{ $add: [{ $subtract: ['$total', orZero('$discount_total')] }, orZero('$round_off')] }, 2] },
      ],
    },
  ],
};

/** Pet store: cancelled orders, then returns that were refunded. */
function storeBranches(): PipelineStage[] {
  return [
    { $match: { channel: 'PET_STORE', cancelled_at: { $ne: null } } },
    {
      $project: {
        buyer_name: 1,
        buyer_email: 1,
        payment_id: 1,
        kind: { $literal: 'CANCELLATION' },
        ref_no: '$order_no',
        order_no: 1,
        order_id: '$_id',
        order_total: '$total',
        event_at: { $ifNull: ['$refund.refunded_at', '$cancelled_at'] },
        cash_amount: { $cond: [STORE_RECORDED, orZero('$refund.amount'), STORE_DERIVED_CASH] },
        coins: { $cond: [STORE_RECORDED, orZero('$refund.coins'), orZero('$coins_share')] },
        razorpay_refund_id: { $literal: '' },
        status: { $cond: [STORE_RECORDED, '$refund.status', 'RECORDED'] },
        initiated_by: { $cond: [STORE_RECORDED, orEmpty('$refund.initiated_by'), orEmpty('$cancelled_by')] },
        error: { $literal: '' },
        derived: { $not: [STORE_RECORDED] },
      },
    },
    {
      $unionWith: {
        coll: StoreReturnModel.collection.name,
        pipeline: [
          { $match: { refunded_at: { $ne: null } } },
          {
            $project: {
              buyer_name: 1,
              buyer_email: 1,
              payment_id: 1,
              kind: { $literal: 'RETURN' },
              ref_no: '$return_no',
              order_no: 1,
              order_id: 1,
              order_total: { $literal: 0 },
              event_at: '$refunded_at',
              // `refundReturn`: COINS credits the floored amount as coins,
              // ORIGINAL records the amount against the payment.
              cash_amount: { $cond: [{ $eq: ['$refund_mode', 'COINS'] }, 0, orZero('$refund_amount')] },
              coins: { $cond: [{ $eq: ['$refund_mode', 'COINS'] }, { $floor: orZero('$refund_amount') }, 0] },
              razorpay_refund_id: { $literal: '' },
              status: { $literal: 'RECORDED' },
              initiated_by: { $literal: 'STORE_RETURN' },
              error: { $literal: '' },
              derived: { $literal: false },
            },
          },
        ],
      },
    },
  ];
}

const HAS_CASH = { $gt: ['$cash_amount', 0] };
const HAS_COINS = { $gt: ['$coins', 0] };

/**
 * The fields every row gets once the branches are one stream: where the money
 * went, what it was worth, and whether Finance has to pay it out by hand — a
 * refund Razorpay refused (pod shop), or any cash at all for the pet store,
 * whose refunds are never sent to a gateway.
 */
function unifiedFields(shop: PaymentShop): PipelineStage[] {
  return [
    {
      $addFields: {
        mode: {
          $switch: {
            branches: [
              { case: { $and: [HAS_CASH, HAS_COINS] }, then: 'RAZORPAY_COINS' },
              { case: HAS_CASH, then: 'RAZORPAY' },
              { case: HAS_COINS, then: 'COINS' },
            ],
            default: 'NONE',
          },
        },
        // 1 coin = 1 rupee, so the two destinations add up to one value.
        refund_value: { $add: ['$cash_amount', '$coins'] },
        manual_payout: shop === 'ECOMM' ? HAS_CASH : { $eq: ['$status', 'FAILED'] },
      },
    },
    // A cancellation that had nothing to give back (an unpaid COD order, a free
    // order) is not a refund.
    { $match: { mode: { $ne: 'NONE' } } },
  ];
}

interface RefundEvent {
  _id: Types.ObjectId;
  kind: string;
  ref_no: string;
  order_no: string;
  order_id: Types.ObjectId;
  payment_id: Types.ObjectId | null;
  buyer_name: string;
  buyer_email: string;
  order_total: number;
  event_at: Date | null;
  cash_amount: number;
  coins: number;
  refund_value: number;
  razorpay_refund_id: string;
  status: string;
  initiated_by: string;
  error: string;
  mode: string;
  derived: boolean;
  manual_payout: boolean;
}

const EMPTY_TOTALS = { count: 0, cash_total: 0, coins_total: 0, manual_payout_total: 0 };

/** One read each names the page's payments and (for returns) their orders — never one per row. */
async function pageLookups(rows: RefundEvent[]) {
  const paymentIds = [...new Set(rows.map((r) => String(r.payment_id ?? '')).filter(Boolean))];
  const returnOrderIds = rows.filter((r) => r.kind === 'RETURN').map((r) => r.order_id);
  const [payments, orders] = await Promise.all([
    PaymentModel.find({ _id: { $in: paymentIds } }).select('payment_id currency_symbol').lean(),
    ProductOrderModel.find({ _id: { $in: returnOrderIds } }).select('total').lean(),
  ]);
  return {
    paymentOf: new Map(payments.map((p) => [String(p._id), p])),
    orderTotalOf: new Map(orders.map((o) => [String(o._id), o.total])),
  };
}

export const orderRefundService = {
  /** Server-side table page plus filter-wide totals for shopOrderRefundsTable. */
  async table(shop: PaymentShop, input?: TableQueryInput | null) {
    const q = input ?? {};
    const { page, pageSize } = clampPage(q);
    const pipeline: PipelineStage[] = [
      ...(shop === 'ECOMM' ? storeBranches() : podShopBranches()),
      ...unifiedFields(shop),
      { $match: buildTableFilter(q, ORDER_REFUND_TABLE_CONFIG) },
      {
        $facet: {
          rows: [
            { $sort: resolveSort(q, ORDER_REFUND_TABLE_CONFIG) },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
          ],
          totals: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                cash_total: { $sum: '$cash_amount' },
                coins_total: { $sum: '$coins' },
                manual_payout_total: { $sum: { $cond: ['$manual_payout', '$cash_amount', 0] } },
              },
            },
          ],
        },
      },
    ];
    const [result] = await ProductOrderModel.aggregate(pipeline).allowDiskUse(true);
    const events: RefundEvent[] = result?.rows ?? [];
    const totals = result?.totals?.[0] ?? EMPTY_TOTALS;
    const { paymentOf, orderTotalOf } = await pageLookups(events);

    const rows = events.map((r) => {
      const payment = r.payment_id ? paymentOf.get(String(r.payment_id)) : undefined;
      return {
        id: String(r._id),
        kind: r.kind,
        ref_no: r.ref_no,
        order_no: r.order_no,
        order_id: String(r.order_id),
        buyer_name: r.buyer_name ?? '',
        buyer_email: r.buyer_email ?? '',
        // Null when the payment row is gone: the page then shows no link.
        payment_doc_id: payment ? String(payment._id) : null,
        payment_ref: payment?.payment_id ?? '',
        currency_symbol: payment?.currency_symbol ?? '₹',
        order_total: orderTotalOf.get(String(r.order_id)) ?? r.order_total ?? 0,
        cash_amount: round2(r.cash_amount ?? 0),
        coins: Math.max(0, Math.floor(r.coins ?? 0)),
        refund_value: round2(r.refund_value ?? 0),
        razorpay_refund_id: r.razorpay_refund_id ?? '',
        status: r.status,
        mode: r.mode,
        initiated_by: r.initiated_by ?? '',
        error: r.error ?? '',
        derived: r.derived === true,
        manual_payout: r.manual_payout === true,
        event_at: r.event_at ? new Date(r.event_at).toISOString() : null,
      };
    });
    return {
      rows,
      total: totals.count,
      page,
      page_size: pageSize,
      summary: {
        count: totals.count,
        cash_total: round2(totals.cash_total),
        coins_total: Math.floor(totals.coins_total),
        manual_payout_total: round2(totals.manual_payout_total),
      },
    };
  },
};
