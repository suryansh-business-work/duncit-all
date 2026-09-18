import crypto from 'node:crypto';
import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { getStoreSettings } from './storeSettings.model';
import {
  StoreReturnModel,
  STORE_RETURN_STATUSES,
  type IStoreReturn,
  type StoreRefundMode,
  type StoreReturnStatus,
} from './storeReturn.model';
import { mailReturnUpdate } from './store.emails';
import { returnDeadline } from './store.order.mapper';
import { creditCoinsBack, recordPaymentRefund, restock } from './store.order.service';
import { listingOf } from './store.product';
import { badInput, forbidden, iso, notFound, round2, sameSecret, toObjectId } from './store.shared';

/**
 * Sending pet-store goods back. The buyer raises a request against a delivered
 * order inside its return window; the ecomm portal approves or rejects it,
 * arranges the pickup, receives the goods (optionally back into stock) and
 * refunds — to the original payment through Finance, or instantly as coins.
 */

/** The moves an operator may make from each status. */
const NEXT: Record<StoreReturnStatus, StoreReturnStatus[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PICKUP_SCHEDULED', 'RECEIVED', 'REJECTED'],
  PICKUP_SCHEDULED: ['RECEIVED', 'REJECTED'],
  RECEIVED: ['REFUNDED', 'CLOSED'],
  REFUNDED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};

const newReturnNo = () => `RET-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

export const toReturnPub = (r: IStoreReturn | any) => ({
  id: String(r._id),
  return_no: r.return_no,
  order_id: String(r.order_id),
  order_no: r.order_no,
  buyer_name: r.buyer_name,
  buyer_email: r.buyer_email,
  is_guest: !r.buyer_id,
  items: (r.items ?? []).map((i: any) => ({
    product_id: String(i.product_id),
    variant_id: i.variant_id ?? '',
    name: i.name,
    variant_label: i.variant_label ?? '',
    image_url: i.image_url ?? '',
    qty: i.qty,
    unit_price: i.unit_cost,
  })),
  reason: r.reason,
  comments: r.comments ?? '',
  images: r.images ?? [],
  status: r.status,
  next_statuses: NEXT[r.status as StoreReturnStatus] ?? [],
  refund_amount: r.refund_amount ?? 0,
  refund_mode: r.refund_mode ?? 'ORIGINAL',
  refunded_at: iso(r.refunded_at),
  restocked: !!r.restocked,
  admin_note: r.admin_note ?? '',
  events: (r.events ?? []).map((e: any) => ({ status: e.status, note: e.note ?? '', by: e.by ?? '', at: iso(e.at) ?? '' })),
  created_at: iso(r.created_at) ?? '',
  updated_at: iso(r.updated_at) ?? '',
});

const RETURN_TABLE: TableEntityConfig = {
  searchFields: ['return_no', 'order_no', 'buyer_name', 'buyer_email'],
  sortFields: {
    return_no: 'return_no',
    order_no: 'order_no',
    buyer_name: 'buyer_name',
    status: 'status',
    refund_amount: 'refund_amount',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    status: { type: 'enum' },
    refund_mode: { type: 'enum' },
    buyer_email: { type: 'string' },
    order_no: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1, _id: -1 },
};

export interface ReturnRequestInput {
  order_no: string;
  access_key?: string | null;
  items: { product_id: string; variant_id?: string | null; qty: number }[];
  reason: string;
  comments?: string | null;
  images?: string[] | null;
}

async function eligibleOrder(ctx: GraphQLContext, orderNo: string, accessKey?: string | null) {
  const order = await ProductOrderModel.findOne({ channel: 'PET_STORE', order_no: String(orderNo ?? '').trim() }).select(
    '+access_key'
  );
  if (!order) notFound('Order not found');
  const owns = order.buyer_id
    ? ctx.user?.id && String(order.buyer_id) === String(ctx.user.id)
    : accessKey && sameSecret(accessKey, order.access_key);
  if (!owns) forbidden('This order is not yours to return');
  return order;
}

/** Units a return may still claim for each purchased line. */
async function claimable(orderId: Types.ObjectId, lines: any[]) {
  const open = await StoreReturnModel.find({ order_id: orderId, status: { $ne: 'REJECTED' } }).select('items').lean();
  const taken = new Map<string, number>();
  for (const r of open) {
    for (const i of r.items) {
      const key = `${String(i.product_id)}|${i.variant_id ?? ''}`;
      taken.set(key, (taken.get(key) ?? 0) + i.qty);
    }
  }
  return new Map(
    lines.map((l) => {
      const key = `${String(l.product_id)}|${l.variant_id ?? ''}`;
      return [key, { line: l, left: l.qty - (taken.get(key) ?? 0) }];
    })
  );
}

export const storeReturnService = {
  async request(ctx: GraphQLContext, input: ReturnRequestInput) {
    const settings = await getStoreSettings();
    if (!settings.returns_enabled) badInput('Returns are not accepted right now');
    const order = await eligibleOrder(ctx, input.order_no, input.access_key);
    const deadline = returnDeadline(order, settings.return_window_days);
    if (!deadline) badInput('A return can be requested once the order is delivered');
    if (deadline.getTime() < Date.now()) badInput('The return window for this order has closed');
    const reason = String(input.reason ?? '').trim();
    if (!reason) badInput('Choose why you are returning it');
    const left = await claimable(order._id as Types.ObjectId, order.line_items);
    const productIds = (input.items ?? []).map((i) => toObjectId(i.product_id)).filter(Boolean);
    const products = await InventoryProductModel.find({ _id: { $in: productIds } }).select('store').lean();
    const returnable = new Map(products.map((p) => [String(p._id), listingOf(p).returnable]));
    const items = (input.items ?? [])
      .filter((i) => Number(i.qty) > 0)
      .map((i) => {
        const key = `${i.product_id}|${i.variant_id ?? ''}`;
        const hit = left.get(key);
        if (!hit) badInput('An item is not part of this order');
        const qty = Math.floor(Number(i.qty));
        if (qty > hit.left) badInput(`Only ${hit.left} of ${hit.line.name} can still be returned`);
        if (returnable.get(String(i.product_id)) === false) badInput(`${hit.line.name} cannot be returned`);
        return {
          product_id: hit.line.product_id,
          variant_id: hit.line.variant_id ?? '',
          name: hit.line.name,
          variant_label: hit.line.variant_label ?? '',
          image_url: hit.line.image_url ?? '',
          qty,
          unit_cost: hit.line.unit_cost,
        };
      });
    if (items.length === 0) badInput('Choose at least one item to return');
    const goods = round2(items.reduce((s, i) => s + i.unit_cost * i.qty, 0));
    // The buyer's share of the order's discount comes off the estimate.
    const discountShare = order.items_total > 0 ? ((order.discount_total ?? 0) * goods) / order.items_total : 0;
    const doc = await StoreReturnModel.create({
      return_no: newReturnNo(),
      order_id: order._id,
      order_no: order.order_no,
      payment_id: order.payment_id,
      buyer_id: order.buyer_id ?? null,
      buyer_name: order.buyer_name,
      buyer_email: order.buyer_email,
      items,
      reason: reason.slice(0, 200),
      comments: String(input.comments ?? '').trim().slice(0, 2000),
      images: (input.images ?? []).filter((u) => /^https?:\/\//.test(String(u))).slice(0, 6),
      status: 'REQUESTED',
      refund_amount: round2(Math.max(0, goods - discountShare)),
      events: [{ status: 'REQUESTED', note: reason, by: 'CUSTOMER', at: new Date() }],
    });
    return toReturnPub(doc);
  },

  async mine(ctx: GraphQLContext) {
    const user = requireAuth(ctx);
    const rows = await StoreReturnModel.find({ buyer_id: new Types.ObjectId(user.id) }).sort({ created_at: -1 }).limit(100);
    return rows.map(toReturnPub);
  },

  async forOrder(orderId: string) {
    const rows = await StoreReturnModel.find({ order_id: toObjectId(orderId) }).sort({ created_at: -1 });
    return rows.map(toReturnPub);
  },

  table(query?: TableQueryInput | null) {
    return runTableQuery<IStoreReturn>(StoreReturnModel, {}, query, RETURN_TABLE).then(
      ({ docs, total, page, page_size }) => ({ rows: docs.map(toReturnPub), total, page, page_size })
    );
  },

  async get(id: string) {
    const doc = await StoreReturnModel.findById(toObjectId(id));
    if (!doc) notFound('Return not found');
    return toReturnPub(doc);
  },

  /** Move a return along. REFUNDED records the money; RECEIVED may restock. */
  async update(
    ctx: GraphQLContext,
    id: string,
    input: { status: StoreReturnStatus; note?: string | null; refund_amount?: number | null; refund_mode?: StoreRefundMode | null; restock?: boolean | null }
  ) {
    const user = requireAuth(ctx);
    const doc = await StoreReturnModel.findById(toObjectId(id));
    if (!doc) notFound('Return not found');
    if (!STORE_RETURN_STATUSES.includes(input.status)) badInput('Unknown return status');
    if (!(NEXT[doc.status] ?? []).includes(input.status)) {
      badInput(`A ${doc.status.toLowerCase()} return cannot move to ${input.status.toLowerCase()}`);
    }
    const note = String(input.note ?? '').trim().slice(0, 1000);
    if (input.refund_amount != null) doc.refund_amount = round2(Math.max(0, Number(input.refund_amount) || 0));
    if (input.refund_mode) doc.refund_mode = input.refund_mode;
    if (note) doc.admin_note = note;
    if (input.status === 'RECEIVED' && input.restock && !doc.restocked) {
      await restock(doc.items);
      doc.restocked = true;
    }
    if (input.status === 'REFUNDED') await refundReturn(doc);
    doc.status = input.status;
    doc.events.push({ status: input.status, note, by: user.email ?? user.id, at: new Date() });
    await doc.save();
    const order = await ProductOrderModel.findById(doc.order_id);
    const currency = order?.currency_symbol ?? '₹';
    await mailReturnUpdate(doc, order, `${currency}${doc.refund_amount.toFixed(2)}`);
    return toReturnPub(doc);
  },
};

async function refundReturn(doc: IStoreReturn) {
  const payment = await PaymentModel.findById(doc.payment_id);
  if (!payment) badInput('The payment behind this order could not be found');
  const amount = round2(doc.refund_amount);
  if (amount <= 0) badInput('Set the refund amount first');
  const reason = `Return ${doc.return_no} on order ${doc.order_no}`;
  if (doc.refund_mode === 'COINS') {
    if (!payment.user_id) badInput('A guest order can only be refunded to the original payment');
    await creditCoinsBack(payment, Math.floor(amount), `store-return:${String(doc._id)}`, reason);
  } else {
    await recordPaymentRefund(payment, amount, reason, 'STORE_RETURN');
  }
  doc.refunded_at = new Date();
}
