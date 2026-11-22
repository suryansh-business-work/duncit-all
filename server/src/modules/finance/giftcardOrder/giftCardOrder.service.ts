import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import {
  GiftCardOrderModel,
  type GiftCardOrderPaymentStatus,
  type IGiftCardOrder,
} from './giftCardOrder.model';
import { GiftCardDesignModel } from './giftCardDesign.model';
import { GiftCardActivityModel, type GiftCardActivityAction } from './giftCardActivity.model';
import { recordDesignActivity } from './giftCardDesign.service';
import { notifyGiftCardOrder } from './giftCardOrder.notify';
import {
  factsMode,
  factsQuantity,
  factsTotal,
  type GiftCardPurchaseFacts,
} from '@modules/finance/giftcard/giftcard.facts';
import { PaymentModel, type IPayment } from '@modules/finance/payment/payment.model';
import { logs } from '@observability/log';

/**
 * Gift card orders — the one record mWeb, the app and the Loyalty portal all
 * read. The money path (checkout → payment success) writes through here, and
 * so do the console's fulfilment actions; the courier feed lives in
 * giftCardOrder.shipment.ts.
 */

const DUPLICATE_KEY = 11000;

/** No 0/O/1/I, like the card codes — an order number read out to support survives the call. */
const ORDER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 'GC-' + 10 characters. Never collides with a product order's 'ord_' numbers,
 * which share ShipRocket's channel order id space. */
export function newGiftCardOrderNo(): string {
  const bytes = crypto.randomBytes(10);
  let raw = '';
  for (const b of bytes) raw += ORDER_ALPHABET[b % ORDER_ALPHABET.length];
  return `GC-${raw}`;
}

const notFound = (): never => {
  throw new GraphQLError('Gift card order not found', { extensions: { code: 'NOT_FOUND' } });
};

const badInput = (message: string, field?: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', ...(field ? { field } : {}) } });
};

const iso = (d: Date | null | undefined) => d?.toISOString?.() ?? null;

export async function recordOrderActivity(
  orderId: Types.ObjectId,
  action: GiftCardActivityAction,
  actorId: string | Types.ObjectId | null,
  note: string,
  session?: ClientSession
): Promise<void> {
  const actor = actorId && Types.ObjectId.isValid(String(actorId)) ? new Types.ObjectId(String(actorId)) : null;
  await GiftCardActivityModel.create(
    [{ entity_type: 'ORDER', entity_id: orderId, action, actor_user_id: actor, note: note.slice(0, 500) }],
    { session }
  );
}

/** The fields every viewer of an order may read — never a card code or passcode. */
export function orderPub(order: IGiftCardOrder) {
  const s = order.shipment;
  return {
    id: String(order._id),
    order_no: order.order_no,
    delivery_mode: order.delivery_mode,
    design_name: order.design_name ?? '',
    design_front_url: order.design_front_url ?? '',
    design_back_url: order.design_back_url ?? '',
    amount: order.amount,
    quantity: order.quantity,
    cards_value: order.cards_value,
    shipping_fee: order.shipping_fee ?? 0,
    total: order.total,
    currency_symbol: order.currency_symbol ?? '',
    recipient_name: order.recipient_name ?? '',
    recipient_email: order.recipient_email ?? '',
    message: order.message ?? '',
    shipping_address: order.shipping_address ?? null,
    payment_status: order.payment_status,
    fulfilment_status: order.fulfilment_status,
    cards_issued: order.gift_card_ids?.length || (order.physical_batch_id ? order.quantity : 0),
    paid_at: iso(order.paid_at),
    emailed_at: iso(order.emailed_at),
    printed_at: iso(order.printed_at),
    delivered_at: iso(order.delivered_at),
    created_at: iso(order.created_at) ?? '',
    updated_at: iso(order.updated_at) ?? '',
    shipment: s?.order_id
      ? {
          courier_name: s.courier_name ?? '',
          awb: s.awb ?? '',
          tracking_status: s.tracking_status ?? '',
          etd: s.etd ?? '',
          pickup_scheduled_date: s.pickup_scheduled_date ?? '',
          last_synced_at: iso(s.last_synced_at),
        }
      : null,
    tracking_events: (order.tracking_events ?? []).map((e) => ({
      status: e.status,
      location: e.location ?? '',
      note: e.note ?? '',
      at: iso(e.at) ?? '',
    })),
  };
}

/** A payment row's status, as the order shows it. SUCCESS is only ever set by the
 * finalizer (it also issues the cards), so a read promotes nothing but failures. */
function readPaymentStatus(status: string | undefined): GiftCardOrderPaymentStatus | null {
  if (status === 'FAILED') return 'FAILED';
  if (status === 'REFUNDED') return 'REFUNDED';
  return null;
}

/**
 * Bring PENDING/PAID orders in line with a payment that has since failed or been
 * refunded. A Razorpay order can still be paid after a failed try, so a FAILED
 * order heals itself when the finalizer later marks it PAID.
 */
export async function syncPaymentStatuses(orders: IGiftCardOrder[]): Promise<void> {
  const open = orders.filter((o) => o.payment_status === 'PENDING' || o.payment_status === 'PAID');
  if (open.length === 0) return;
  const payments = await PaymentModel.find({ _id: { $in: open.map((o) => o.payment_doc_id) } })
    .select('status')
    .lean();
  const byId = new Map(payments.map((p) => [String(p._id), String(p.status)]));
  for (const order of open) {
    const next = readPaymentStatus(byId.get(String(order.payment_doc_id)));
    if (!next || next === order.payment_status) continue;
    if (next === 'FAILED' && order.payment_status === 'PAID') continue;
    order.payment_status = next;
    await GiftCardOrderModel.updateOne({ _id: order._id }, { $set: { payment_status: next } });
  }
}

function orderFieldsFrom(payment: IPayment, facts: GiftCardPurchaseFacts) {
  const quantity = factsQuantity(facts);
  const mode = factsMode(facts);
  return {
    user_id: payment.user_id,
    buyer_name: payment.user_name ?? '',
    buyer_email: payment.user_email ?? '',
    buyer_phone: payment.user_phone ?? '',
    payment_id: payment.payment_id,
    payment_doc_id: payment._id,
    delivery_mode: mode,
    design_id: facts.design_id ? new Types.ObjectId(facts.design_id) : null,
    design_name: facts.design_name || facts.scope_name || '',
    design_front_url: facts.scope_image_front_url || facts.scope_image_url || '',
    design_back_url: facts.scope_image_back_url || '',
    amount: facts.amount,
    quantity,
    cards_value: facts.amount * quantity,
    shipping_fee: mode === 'PHYSICAL' ? Number(facts.shipping_fee) || 0 : 0,
    total: factsTotal(facts),
    currency_symbol: payment.currency_symbol ?? '',
    recipient_name: facts.recipient_name ?? '',
    recipient_email: facts.recipient_email ?? '',
    message: facts.message ?? '',
    shipping_address: mode === 'PHYSICAL' ? facts.shipping_address ?? null : null,
  };
}

/** The order of one payment, created PENDING the first time it is asked for. */
async function upsertForPayment(
  payment: IPayment,
  facts: GiftCardPurchaseFacts,
  session?: ClientSession
): Promise<{ order: IGiftCardOrder; created: boolean }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await GiftCardOrderModel.findOne({ payment_id: payment.payment_id }).session(
      session ?? null
    );
    if (existing) return { order: existing, created: false };
    try {
      const [order] = await GiftCardOrderModel.create(
        [{ ...orderFieldsFrom(payment, facts), order_no: newGiftCardOrderNo() }],
        { session }
      );
      return { order, created: true };
    } catch (e) {
      // An order number collided (retry with a new one), or a concurrent replay
      // created this payment's order first (the loop re-reads it).
      if ((e as { code?: number })?.code !== DUPLICATE_KEY) throw e;
    }
  }
  throw new GraphQLError('The gift card order could not be created', {
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  });
}

/**
 * Take a paid physical order's cards out of its design's stock — once. One
 * guarded update: if the stock cannot cover it (two buyers raced the last
 * cards), the order is flagged instead and the Loyalty team prints more.
 */
async function consumeStock(order: IGiftCardOrder, session?: ClientSession): Promise<void> {
  if (order.delivery_mode !== 'PHYSICAL' || order.stock_consumed || order.stock_short || !order.design_id) return;
  const taken = await GiftCardDesignModel.findOneAndUpdate(
    { _id: order.design_id, physical_stock: { $gte: order.quantity } },
    { $inc: { physical_stock: -order.quantity } },
    { new: true, session }
  );
  if (taken) {
    order.stock_consumed = true;
    await recordDesignActivity(order.design_id, 'STOCK_CONSUMED', String(order.user_id), `-${order.quantity} (${order.order_no})`, session);
    return;
  }
  order.stock_short = true;
  await recordOrderActivity(order._id, 'STOCK_SHORT', null, `Stock could not cover ${order.quantity} cards`, session);
  logs.server.warn('giftCardOrder', 'stockShort', { order_no: order.order_no, quantity: order.quantity });
}

export interface PaidOrderOutcome {
  order: IGiftCardOrder;
  detail: string;
  refs: string[];
}

export const giftCardOrderService = {
  /** Checkout: the PENDING order beside the PENDING payment, so a payment that
   * never completes is still an order the console and the buyer can see. */
  async createForPayment(payment: IPayment, facts: GiftCardPurchaseFacts): Promise<IGiftCardOrder> {
    const { order, created } = await upsertForPayment(payment, facts);
    if (created) {
      await recordOrderActivity(order._id, 'ORDER_PLACED', String(payment.user_id), `${order.quantity} × ${order.amount}, ${order.delivery_mode}`);
    }
    return order;
  },

  /**
   * Payment success, inside the finalizer's transaction: mark the order paid,
   * take physical stock, and issue the cards — N virtual cards for a digital
   * order, one scratch-card batch of N for a physical one. Every write is
   * idempotent, so a replayed success path changes nothing a second time.
   */
  async onPaid(payment: IPayment, facts: GiftCardPurchaseFacts, session?: ClientSession): Promise<PaidOrderOutcome> {
    const { order } = await upsertForPayment(payment, facts, session);
    const firstTime = order.payment_status !== 'PAID';
    order.payment_status = 'PAID';
    order.paid_at = order.paid_at ?? payment.paid_at ?? new Date();
    if (order.fulfilment_status === 'PENDING') order.fulfilment_status = 'PROCESSING';
    const refs = await this.issueCards(order, payment, facts, session);
    await consumeStock(order, session);
    await order.save({ session });
    if (firstTime) {
      await recordOrderActivity(order._id, 'ORDER_PAID', String(payment.user_id), payment.payment_id, session);
      await recordOrderActivity(order._id, 'CARDS_ISSUED', null, `${refs.length || order.quantity} ${order.delivery_mode === 'PHYSICAL' ? 'scratch cards' : 'virtual cards'}`, session);
    }
    return { order, detail: `${order.order_no} · ${order.quantity} card(s)`, refs };
  },

  /** The cards themselves. Answers the ids written onto the payment step. */
  async issueCards(
    order: IGiftCardOrder,
    payment: IPayment,
    facts: GiftCardPurchaseFacts,
    session?: ClientSession
  ): Promise<string[]> {
    if (order.delivery_mode === 'PHYSICAL') {
      const { physicalGiftCardService } = await import('@modules/finance/physicalGiftCard/physicalGiftCard.service');
      const batch = await physicalGiftCardService.mintForOrder({
        orderId: String(order._id),
        orderNo: order.order_no,
        purchaserId: String(payment.user_id),
        coins: order.amount,
        quantity: order.quantity,
        session,
      });
      order.physical_batch_id = batch._id;
      return [String(batch._id)];
    }
    const { giftcardService } = await import('@modules/finance/giftcard/giftcard.service');
    const cards = await giftcardService.issueAllForPayment({
      paymentId: payment.payment_id,
      purchaserId: String(payment.user_id),
      facts,
      orderId: String(order._id),
      session,
    });
    order.gift_card_ids = cards.map((c) => c._id);
    return cards.map((c) => String(c._id));
  },

  /** After commit: the buyer hears the order is confirmed and paid. */
  async confirm(paymentId: string): Promise<IGiftCardOrder | null> {
    const order = await GiftCardOrderModel.findOne({ payment_id: paymentId });
    if (order) await notifyGiftCardOrder(order, 'GIFT_CARD_ORDER_CONFIRMED');
    return order;
  },

  /** Every digital card was mailed: that is a digital order delivered. */
  async markEmailed(paymentId: string, to: string): Promise<void> {
    const order = await GiftCardOrderModel.findOne({ payment_id: paymentId });
    if (!order || order.delivery_mode !== 'DIGITAL') return;
    const firstTime = !order.emailed_at;
    order.emailed_at = order.emailed_at ?? new Date();
    order.delivered_at = order.delivered_at ?? new Date();
    order.fulfilment_status = 'DELIVERED';
    await order.save();
    if (firstTime) {
      await recordOrderActivity(order._id, 'CARDS_EMAILED', null, to);
      await notifyGiftCardOrder(order, 'GIFT_CARD_ORDER_DELIVERED');
    }
  },

  /** The member's own orders, newest first. */
  async myOrders(userId: string, page = 1, pageSize = 20) {
    if (!Types.ObjectId.isValid(userId)) return { rows: [], total: 0, page: 1, page_size: pageSize };
    const size = Math.min(50, Math.max(1, Math.floor(pageSize) || 20));
    const current = Math.max(1, Math.floor(page) || 1);
    const filter = { user_id: new Types.ObjectId(userId) };
    const [orders, total] = await Promise.all([
      GiftCardOrderModel.find(filter)
        .sort({ created_at: -1 })
        .skip((current - 1) * size)
        .limit(size),
      GiftCardOrderModel.countDocuments(filter),
    ]);
    await syncPaymentStatuses(orders);
    return { rows: orders.map(orderPub), total, page: current, page_size: size };
  },

  /** One of the member's orders. Someone else's order reads as not found. */
  async myOrder(userId: string, orderNo: string) {
    const no = (orderNo ?? '').trim().toUpperCase();
    if (!no || !Types.ObjectId.isValid(userId)) notFound();
    const order = await GiftCardOrderModel.findOne({ order_no: no, user_id: new Types.ObjectId(userId) });
    if (!order) return notFound();
    await syncPaymentStatuses([order]);
    return orderPub(order);
  },

  async findById(id: string): Promise<IGiftCardOrder> {
    if (!Types.ObjectId.isValid(id)) badInput('Choose a gift card order');
    return (await GiftCardOrderModel.findById(id)) ?? notFound();
  },
};
