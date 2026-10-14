import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { ProductOrderModel, type IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import { issueRefund, retryRefund } from '@modules/commerce/productOrder/productOrder.refund';
import { notifyReturnUpdate } from '@modules/commerce/productOrder/productOrder.notify';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { ownedBrandIds } from '@modules/venues/ecommBrand/ecommBrand.model';
import {
  OPEN_RETURN_STATUSES,
  PodShopReturnModel,
  type IPodShopReturn,
  type IPodShopReturnItem,
  type PodShopReturnStatus,
} from './podShopReturn.model';
import { RETURN_STATUS_WORDS, returnableLines, type ReturnableLine } from './podShopReturn.rules';
import { bookPodShopReturnPickup } from './podShopReturn.pickup';

/**
 * Pod-shop returns, end to end: the buyer asks (mWeb / app), the brand
 * (Partners portal) or the Products team decides, a ShipRocket reverse pickup
 * on the brand's own account collects the goods, and once they are back the
 * goods return to stock and the buyer is refunded through Razorpay.
 */

/** Who is acting on a return: the Products team, or the owner of a brand on it. */
export interface ReturnActor {
  kind: 'STAFF' | 'BRAND';
  userId: string;
  /** Written on the return's history — an email or a name. */
  label: string;
}

export interface ReturnRequestInput {
  order_id: string;
  items: { product_id: string; variant_id?: string | null; qty: number }[];
  reason: string;
  comments?: string | null;
}

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_REQUEST' } });
}
function notFound(): never {
  throw new GraphQLError('Return not found', { extensions: { code: 'NOT_FOUND' } });
}

const newReturnNo = () => `RET-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

export const toReturnPub = (r: IPodShopReturn) => ({
  id: String(r._id),
  return_no: r.return_no,
  order_id: String(r.order_id),
  order_no: r.order_no,
  buyer_id: r.buyer_id ? String(r.buyer_id) : null,
  buyer_name: r.buyer_name,
  buyer_email: r.buyer_email,
  brand_ids: r.brand_ids.map(String),
  items: r.items.map((i) => ({
    product_id: String(i.product_id),
    variant_id: i.variant_id,
    name: i.name,
    variant_label: i.variant_label,
    image_url: i.image_url,
    qty: i.qty,
    unit_cost: i.unit_cost,
  })),
  reason: r.reason,
  comments: r.comments,
  status: r.status,
  gross: r.gross,
  decision_note: r.decision_note,
  events: r.events.map((e) => ({ status: e.status, note: e.note, by: e.by, at: e.at.toISOString() })),
  pickup: {
    awb: r.pickup.awb,
    courier_name: r.pickup.courier_name,
    status: r.pickup.status || 'NONE',
    tracking_status: r.pickup.tracking_status,
    last_error: r.pickup.last_error,
  },
  refund: {
    status: r.refund.status || 'NONE',
    amount: r.refund.amount,
    coins: r.refund.coins,
    razorpay_refund_id: r.refund.razorpay_refund_id,
    refunded_at: r.refund.refunded_at ? r.refund.refunded_at.toISOString() : null,
    error: r.refund.error,
    initiated_by: r.refund.initiated_by,
  },
  created_at: r.created_at.toISOString(),
  updated_at: r.updated_at.toISOString(),
});

const RETURN_TABLE: TableEntityConfig = {
  searchFields: ['return_no', 'order_no', 'buyer_name', 'buyer_email', 'items.name'],
  sortFields: { return_no: 'return_no', order_no: 'order_no', status: 'status', gross: 'gross', created_at: 'created_at' },
  filterFields: {
    status: { type: 'enum' },
    order_no: { type: 'string' },
    buyer_name: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** A return the actor may act on. */
async function loadFor(actor: ReturnActor, id: string) {
  const ret = Types.ObjectId.isValid(id) ? await PodShopReturnModel.findById(id) : null;
  if (!ret) return notFound();
  if (actor.kind === 'BRAND') {
    const mine = new Set((await ownedBrandIds(actor.userId)).map(String));
    if (!ret.brand_ids.some((b) => mine.has(String(b)))) notFound();
  }
  return ret;
}

function move(ret: IPodShopReturn, status: PodShopReturnStatus, note: string, by: string) {
  ret.status = status;
  ret.events.push({ status, note, by, at: new Date() });
}

async function tellBuyer(ret: IPodShopReturn, note = '') {
  const order = await ProductOrderModel.findById(ret.order_id);
  if (!order) return;
  await notifyReturnUpdate(order, {
    id: String(ret._id),
    return_no: ret.return_no,
    status: ret.status,
    status_label: RETURN_STATUS_WORDS[ret.status],
    note,
    refund: ret.refund,
  });
}

/**
 * Book the reverse pickup on the brand's ShipRocket account (SHIP orders only).
 * A courier refusal already lands on `pickup.last_error`; anything else that
 * throws (the account lookup) is recorded the same way, so the return stays
 * APPROVED with the reason on it and Retry pickup picks it up from there.
 */
async function bookPickup(ret: IPodShopReturn, order: IProductOrder) {
  try {
    await bookPodShopReturnPickup(ret, order);
  } catch (error) {
    const lastError = error instanceof Error ? error.message : String(error);
    const failed = ret.pickup.sr_order_id ? {} : { 'pickup.status': 'FAILED' };
    logs.server.warn('podShopReturn', 'pickup', { return_no: ret.return_no, msg: lastError });
    await PodShopReturnModel.updateOne({ _id: ret._id }, { $set: { 'pickup.last_error': lastError, ...failed } });
    ret.pickup.last_error = lastError;
    if (!ret.pickup.sr_order_id) ret.pickup.status = 'FAILED';
  }
}

/**
 * Decide a requested return in one atomic write: of two concurrent decisions
 * only the first finds it REQUESTED, so a return is never approved twice (two
 * courier pickups) nor approved and rejected at once. Null when it was not.
 */
function claimDecision(ret: IPodShopReturn, status: 'APPROVED' | 'REJECTED', note: string, decisionNote: string, by: string) {
  return PodShopReturnModel.findOneAndUpdate(
    { _id: ret._id, status: 'REQUESTED' },
    {
      $set: { status, decision_note: decisionNote.slice(0, 2000) },
      $push: { events: { status, note, by, at: new Date() } },
    },
    { new: true }
  );
}

/** Group the requested units by brand — one return per brand, since each brand decides its own. */
function splitByBrand(order: IProductOrder, asked: Map<string, number>) {
  const groups = new Map<string, IPodShopReturnItem[]>();
  for (const line of order.line_items) {
    const qty = asked.get(`${String(line.product_id)}|${line.variant_id}`) ?? 0;
    if (qty <= 0) continue;
    const brand = line.brand_id ? String(line.brand_id) : '';
    const items = groups.get(brand) ?? [];
    items.push({
      product_id: line.product_id,
      variant_id: line.variant_id,
      brand_id: line.brand_id,
      name: line.name,
      variant_label: line.variant_label,
      image_url: line.image_url,
      qty,
      unit_cost: line.unit_cost,
    });
    groups.set(brand, items);
  }
  return groups;
}

export const podShopReturnService = {
  toPub: toReturnPub,

  async request(userId: string, input: ReturnRequestInput) {
    const reason = input.reason.trim();
    if (!reason) bad('Tell us why you are returning it');
    const order = Types.ObjectId.isValid(input.order_id) ? await ProductOrderModel.findById(input.order_id) : null;
    if (!order || String(order.buyer_id) !== userId || order.channel !== 'POD_SHOP') {
      throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const existing = await PodShopReturnModel.find({ order_id: order._id }).select('items status').lean();
    const lines = new Map(
      returnableLines(order, existing).map((l): [string, ReturnableLine] => [`${l.product_id}|${l.variant_id}`, l])
    );
    // Units asked per line, summed: two entries for one line cannot slip past the limit together.
    const asked = new Map<string, number>();
    for (const want of input.items) {
      const key = `${want.product_id}|${want.variant_id ?? ''}`;
      asked.set(key, (asked.get(key) ?? 0) + Math.floor(Number(want.qty) || 0));
    }
    for (const [key, qty] of asked) {
      const line = lines.get(key);
      if (!line || qty > line.returnable_qty) {
        bad(line?.returnable_until ? 'The return window for this item has closed, or it is already being returned' : 'This item cannot be returned');
      }
    }
    const groups = splitByBrand(order, asked);
    if (groups.size === 0) bad('Pick at least one item to return');
    const created: IPodShopReturn[] = [];
    for (const [brand, items] of groups) {
      const ret = await PodShopReturnModel.create({
        return_no: newReturnNo(),
        order_id: order._id,
        order_no: order.order_no,
        payment_id: order.payment_id,
        buyer_id: order.buyer_id,
        buyer_name: order.buyer_name,
        buyer_email: order.buyer_email,
        brand_ids: brand ? [new Types.ObjectId(brand)] : [],
        items,
        reason: reason.slice(0, 200),
        comments: String(input.comments ?? '').trim().slice(0, 2000),
        gross: round2(items.reduce((s, i) => s + i.unit_cost * i.qty, 0)),
        events: [{ status: 'REQUESTED', note: reason.slice(0, 1000), by: 'Buyer', at: new Date() }],
      });
      created.push(ret);
      await tellBuyer(ret);
      logs.server.info('podShopReturn', 'request', { return_no: ret.return_no, order_no: order.order_no, brand });
    }
    return created.map(toReturnPub);
  },

  async mine(userId: string) {
    const docs = await PodShopReturnModel.find({ buyer_id: new Types.ObjectId(userId) }).sort({ created_at: -1 }).limit(200);
    return docs.map(toReturnPub);
  },

  async cancelMine(userId: string, id: string) {
    const ret = Types.ObjectId.isValid(id) ? await PodShopReturnModel.findById(id) : null;
    if (!ret || String(ret.buyer_id) !== userId) return notFound();
    if (ret.status !== 'REQUESTED') bad('This return is already being processed — contact support to stop it');
    move(ret, 'CANCELLED', 'Withdrawn by the buyer', 'Buyer');
    await ret.save();
    return toReturnPub(ret);
  },

  /** The Products team's table (every return) or a partner's (their brands' returns). */
  async table(actor: ReturnActor, query?: TableQueryInput | null, brandId?: string | null) {
    const base: Record<string, unknown> = {};
    if (actor.kind === 'BRAND') {
      const owned = await ownedBrandIds(actor.userId);
      const scoped = brandId ? owned.filter((b) => String(b) === brandId) : owned;
      base.brand_ids = { $in: scoped };
    } else if (brandId && Types.ObjectId.isValid(brandId)) {
      base.brand_ids = new Types.ObjectId(brandId);
    }
    const { docs, total, page, page_size } = await runTableQuery<IPodShopReturn>(PodShopReturnModel, base, query, RETURN_TABLE);
    return { rows: docs.map(toReturnPub), total, page, page_size };
  },

  async approve(actor: ReturnActor, id: string, note: string) {
    const ret = await loadFor(actor, id);
    if (ret.status !== 'REQUESTED') bad('Only a requested return can be approved');
    const order = await ProductOrderModel.findById(ret.order_id);
    if (!order) return bad('The order behind this return is gone');
    // Claimed before the courier is called: a second approval finds it decided.
    const approved = await claimDecision(ret, 'APPROVED', note || 'Approved', note, actor.label);
    if (!approved) return bad('Only a requested return can be approved');
    // A shipped order is collected by courier; a pickup order is handed back at the venue.
    if (order.fulfilment_method === 'SHIP') await bookPickup(approved, order);
    await tellBuyer(approved, note);
    return toReturnPub(approved);
  },

  async reject(actor: ReturnActor, id: string, note: string) {
    const reason = note.trim();
    if (!reason) bad('Tell the buyer why the return is not accepted');
    const ret = await loadFor(actor, id);
    if (ret.status !== 'REQUESTED') bad('Only a requested return can be rejected');
    const rejected = await claimDecision(ret, 'REJECTED', reason, reason, actor.label);
    if (!rejected) return bad('Only a requested return can be rejected');
    await tellBuyer(rejected, reason);
    return toReturnPub(rejected);
  },

  /** Retry a reverse pickup ShipRocket refused (wallet, address, packaging…). */
  async retryPickup(actor: ReturnActor, id: string) {
    const ret = await loadFor(actor, id);
    if (ret.status !== 'APPROVED') bad('Only an approved return still waiting for its pickup can be retried');
    const order = await ProductOrderModel.findById(ret.order_id);
    if (!order) return bad('The order behind this return is gone');
    await bookPickup(ret, order);
    return toReturnPub(ret);
  },

  /** The goods are back (handed in at the venue, or the courier scan never came). */
  async markReceived(actor: ReturnActor, id: string) {
    const ret = await loadFor(actor, id);
    if (ret.status !== 'APPROVED' && ret.status !== 'PICKUP_SCHEDULED') bad('Only an approved return can be marked received');
    move(ret, 'RECEIVED', 'Marked received', actor.label);
    await ret.save();
    await tellBuyer(ret);
    return toReturnPub(ret);
  },

  /** Goods checked: back on the shelf, money back to the buyer. */
  async refund(actor: ReturnActor, id: string) {
    const ret = await loadFor(actor, id);
    if (ret.status !== 'RECEIVED') bad('Refund once the goods are back at the pickup address');
    const claimed = await PodShopReturnModel.updateOne(
      { _id: ret._id, status: 'RECEIVED', 'refund.status': '' },
      { $set: { 'refund.status': 'PENDING' } }
    );
    if (claimed.modifiedCount === 0) bad('This refund is already on its way');
    ret.refund.status = '';
    for (const item of ret.items) {
      await InventoryProductModel.updateOne({ _id: item.product_id }, { $inc: { inventory_count: item.qty } });
    }
    await issueRefund(ret, {
      paymentId: ret.payment_id,
      gross: ret.gross,
      receipt: ret.return_no,
      reason: `Return ${ret.return_no} on order ${ret.order_no}`,
      initiatedBy: 'POD_SHOP_RETURN',
    });
    move(ret, 'REFUNDED', `Refund ${ret.refund.status}`, actor.label);
    await ret.save();
    await tellBuyer(ret);
    return toReturnPub(ret);
  },

  async retryRefund(actor: ReturnActor, id: string) {
    const ret = await loadFor(actor, id);
    await retryRefund(
      ret,
      {
        paymentId: ret.payment_id,
        gross: ret.gross,
        receipt: ret.return_no,
        reason: `Return ${ret.return_no} on order ${ret.order_no}`,
        initiatedBy: 'POD_SHOP_RETURN',
      },
      PodShopReturnModel
    );
    return toReturnPub(ret);
  },

  /** The courier delivered the return to the brand's warehouse. */
  async onArrived(ret: IPodShopReturn) {
    logs.server.info('podShopReturn', 'arrived', { return_no: ret.return_no });
    await tellBuyer(ret);
  },

  /** Returns still being worked on these products or this brand — a deletion waits for them. */
  countOpen(filter: { productIds?: Types.ObjectId[]; brandId?: Types.ObjectId }) {
    const q: Record<string, unknown> = { status: { $in: OPEN_RETURN_STATUSES } };
    if (filter.productIds) q['items.product_id'] = { $in: filter.productIds };
    if (filter.brandId) q.brand_ids = filter.brandId;
    return PodShopReturnModel.countDocuments(q);
  },
};
