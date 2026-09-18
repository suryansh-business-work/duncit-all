import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { logs } from '@observability/log';
import {
  ProductOrderModel,
  type FulfilmentStatus,
  type IProductOrder,
} from '@modules/commerce/productOrder/productOrder.model';
import { productOrderService } from '@modules/commerce/productOrder/productOrder.service';
import { cancelOrders } from '@modules/commerce/shiprocket/shiprocket.gateway';
import { PaymentModel, type IPayment } from '@modules/finance/payment/payment.model';
import { coinService } from '@modules/finance/coin/coin.service';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { UserModel } from '@modules/access/user/user.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { getStoreSettings } from './storeSettings.model';
import { StoreReturnModel } from './storeReturn.model';
import { mailOrderUpdate } from './store.emails';
import { CANCELLABLE, toStoreOrder } from './store.order.mapper';
import { badInput, forbidden, notFound, round2, sameSecret, toObjectId } from './store.shared';

/**
 * A pet-store order after checkout: the buyer's view of it (their orders, a
 * guest's lookup, cancelling), the ecomm portal's operations on it, and the
 * one reaction to a status change — COD settling on delivery and the buyer
 * being told.
 */

export type StoreRefundMode = 'ORIGINAL' | 'COINS';

const PET_STORE = { channel: 'PET_STORE' } as const;

/** Units already on an open or settled return, per `product|variant`. */
async function returnedQtyFor(orderId: Types.ObjectId) {
  const returns = await StoreReturnModel.find({ order_id: orderId, status: { $ne: 'REJECTED' } })
    .select('items')
    .lean();
  const map = new Map<string, number>();
  for (const r of returns) {
    for (const i of r.items) {
      const key = `${String(i.product_id)}|${i.variant_id ?? ''}`;
      map.set(key, (map.get(key) ?? 0) + i.qty);
    }
  }
  return map;
}

/** The buyer's view of one order, with its returns folded in. */
async function buyerView(order: IProductOrder) {
  const [payment, settings, returned] = await Promise.all([
    PaymentModel.findById(order.payment_id),
    getStoreSettings(),
    returnedQtyFor(order._id as Types.ObjectId),
  ]);
  return toStoreOrder(order, payment, {
    returnsEnabled: settings.returns_enabled,
    returnWindowDays: settings.return_window_days,
    returnedQty: returned,
  });
}

/** Load an order its buyer may act on: their own account's, or a guest's by key. */
async function ownedOrder(ctx: GraphQLContext, orderNo: string, accessKey?: string | null) {
  const order = await ProductOrderModel.findOne({ ...PET_STORE, order_no: String(orderNo ?? '').trim() }).select(
    '+access_key'
  );
  if (!order) notFound('Order not found');
  if (order.buyer_id) {
    if (ctx.user?.id && String(order.buyer_id) === String(ctx.user.id)) return order;
    forbidden('Sign in with the account that placed this order');
  }
  if (accessKey && sameSecret(accessKey, order.access_key)) return order;
  forbidden('This order link is not valid');
}

/* ------------------------------------------------------------------ *
 * Money going back
 * ------------------------------------------------------------------ */

/**
 * Record a refund on the payment it reverses — the same stamps every other
 * refund flow writes, so it lands in Finance › User Refund Logs for payout.
 */
export async function recordPaymentRefund(
  payment: IPayment,
  amount: number,
  reason: string,
  initiatedBy: string
) {
  if (amount <= 0) return;
  const meta = (payment.metadata ?? {}) as Record<string, any>;
  const refunded = round2((Number(meta.refunded_amount) || 0) + amount);
  const update: Record<string, unknown> = {
    'metadata.refunded_at': new Date().toISOString(),
    'metadata.refunded_amount': refunded,
    'metadata.refund_reason': reason,
    'metadata.refund_initiated_by': initiatedBy,
  };
  if (refunded >= payment.total - 0.01) update.status = 'REFUNDED';
  await PaymentModel.updateOne({ _id: payment._id }, { $set: update });
}

/** Coins back into a buyer's balance, once per key (the ledger dedupes). */
export async function creditCoinsBack(payment: IPayment, coins: number, key: string, reason: string) {
  if (!payment.user_id || coins <= 0) return 0;
  // refundForBackout is the ledger's generic idempotent PAYMENT_REFUND credit;
  // `backoutId` is only its dedupe key, here the order or return it refunds.
  return coinService.refundForBackout({
    userId: String(payment.user_id),
    backoutId: key,
    paymentId: payment.payment_id,
    coins,
    reason,
  });
}

/** Put cancelled / returned units back on the shelf and off the sold count. */
export async function restock(items: { product_id: unknown; variant_id?: string; qty: number }[]) {
  for (const item of items) {
    const qty = Math.floor(Number(item.qty) || 0);
    const productId = toObjectId(item.product_id);
    if (!productId || qty <= 0) continue;
    const inc: Record<string, number> = { inventory_count: qty, 'store.sold_count': -qty };
    const options: Record<string, unknown> = {};
    if (item.variant_id && Types.ObjectId.isValid(item.variant_id)) {
      inc['variants.$[v].inventory_count'] = qty;
      options.arrayFilters = [{ 'v._id': new Types.ObjectId(item.variant_id) }];
    }
    await InventoryProductModel.updateOne({ _id: productId }, { $inc: inc }, options);
  }
  await InventoryProductModel.updateMany({ 'store.sold_count': { $lt: 0 } }, { $set: { 'store.sold_count': 0 } });
}

interface CancelOptions {
  by: 'CUSTOMER' | 'ADMIN';
  byName: string;
  reason: string;
  refundMode: StoreRefundMode;
}

/**
 * Call an order off: courier first (a parcel already booked must be cancelled
 * with ShipRocket or it ships anyway), then the order, the stock and the money.
 */
async function cancelOrder(order: IProductOrder, opts: CancelOptions) {
  if (order.cancelled_at || !CANCELLABLE.has(order.fulfilment_status)) {
    badInput('This order can no longer be cancelled — it is already with the courier');
  }
  if (order.shiprocket?.order_id) {
    try {
      await cancelOrders([order.shiprocket.order_id]);
    } catch (error) {
      logs.server.error('store', 'cancelOrder', { error, order_no: order.order_no });
      badInput('The courier could not cancel this shipment — please contact support');
    }
  }
  const reason = String(opts.reason ?? '').trim().slice(0, 500) || 'Cancelled';
  order.fulfilment_status = 'CANCELLED';
  order.cancelled_at = new Date();
  order.cancel_reason = reason;
  order.cancelled_by = opts.by === 'ADMIN' ? `ADMIN:${opts.byName}` : 'CUSTOMER';
  order.tracking_events.push({ status: 'CANCELLED', code: 0, location: '', note: reason, at: new Date() } as any);
  await order.save();

  const settings = await getStoreSettings();
  if (settings.restock_on_cancel) await restock(order.line_items);
  await settleCancellationMoney(order, opts);
  await mailOrderUpdate(order);
}

async function settleCancellationMoney(order: IProductOrder, opts: CancelOptions) {
  const payment = await PaymentModel.findById(order.payment_id);
  if (!payment) return;
  const siblings = await ProductOrderModel.find({ payment_id: payment._id }).select('cancelled_at').lean();
  const allCancelled = siblings.every((s) => s.cancelled_at);
  if (order.payment_method === 'COD') {
    // Nothing was paid. The coins that were spent on it come back.
    await creditCoinsBack(payment, order.coins_share, `store-cancel:${String(order._id)}`, `Order ${order.order_no} cancelled`);
    if (allCancelled) {
      await PaymentModel.updateOne(
        { _id: payment._id },
        { $set: { status: 'FAILED', 'metadata.cod_cancelled_at': new Date().toISOString() } }
      );
    }
    return;
  }
  const cash = round2(Math.max(0, order.total - (order.discount_total ?? 0)));
  const reason = `Order ${order.order_no} cancelled`;
  await creditCoinsBack(payment, order.coins_share, `store-cancel:${String(order._id)}`, reason);
  if (opts.refundMode === 'COINS' && payment.user_id) {
    await creditCoinsBack(payment, Math.floor(cash), `store-cancel-cash:${String(order._id)}`, reason);
    return;
  }
  await recordPaymentRefund(payment, cash, reason, opts.by === 'ADMIN' ? 'STORE_ADMIN_CANCEL' : 'STORE_CUSTOMER_CANCEL');
}

/* ------------------------------------------------------------------ *
 * Reacting to a status change (courier webhook, tracking pull, operator)
 * ------------------------------------------------------------------ */

/**
 * The one reaction to a pet-store order moving. Called by every path that
 * writes a fulfilment status, AFTER it is saved: a COD parcel delivered is
 * cash collected, and the buyer is told about the moves they care about.
 */
export async function afterStoreStatusChange(order: IProductOrder, previous: FulfilmentStatus) {
  if (order.channel !== 'PET_STORE' || order.fulfilment_status === previous) return;
  try {
    if (order.fulfilment_status === 'DELIVERED' && order.payment_method === 'COD' && !order.cod_collected_at) {
      await markCodCollected(order);
    }
    await mailOrderUpdate(order);
  } catch (error) {
    logs.server.error('store', 'afterStoreStatusChange', { error, order_no: order.order_no });
  }
}

/** Cash in hand for a COD order; the payment is captured once every order on it is. */
async function markCodCollected(order: IProductOrder) {
  await ProductOrderModel.updateOne({ _id: order._id }, { $set: { cod_collected_at: new Date() } });
  order.cod_collected_at = new Date();
  const siblings = await ProductOrderModel.find({ payment_id: order.payment_id, cancelled_at: null })
    .select('cod_collected_at')
    .lean();
  if (siblings.every((s) => s.cod_collected_at)) {
    await PaymentModel.updateOne(
      { _id: order.payment_id, status: 'PENDING' },
      { $set: { status: 'SUCCESS', paid_at: new Date() } }
    );
  }
}

/* ------------------------------------------------------------------ *
 * The ecomm portal's order table
 * ------------------------------------------------------------------ */

const STORE_ORDER_TABLE: TableEntityConfig = {
  searchFields: ['order_no', 'buyer_name', 'buyer_email', 'buyer_phone', 'shiprocket.awb'],
  sortFields: {
    order_no: 'order_no',
    buyer_name: 'buyer_name',
    buyer_email: 'buyer_email',
    fulfilment_status: 'fulfilment_status',
    payment_method: 'payment_method',
    total: 'total',
    cod_amount: 'cod_amount',
    created_at: 'created_at',
    updated_at: 'updated_at',
    awb: 'shiprocket.awb',
  },
  filterFields: {
    order_no: { type: 'string' },
    buyer_name: { type: 'string' },
    buyer_email: { type: 'string' },
    fulfilment_status: { type: 'enum' },
    payment_method: { type: 'enum' },
    awb: { path: 'shiprocket.awb', type: 'string' },
    total: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1, _id: -1 },
};

async function adminOrder(id: string) {
  const oid = toObjectId(id);
  const order = oid ? await ProductOrderModel.findOne({ _id: oid, ...PET_STORE }) : null;
  if (!order) notFound('Order not found');
  return order;
}

export const storeOrderService = {
  /** The signed-in buyer's pet-store orders, newest first. */
  async mine(ctx: GraphQLContext) {
    const user = requireAuth(ctx);
    const orders = await ProductOrderModel.find({ ...PET_STORE, buyer_id: new Types.ObjectId(user.id) })
      .sort({ created_at: -1, _id: -1 })
      .limit(100);
    return Promise.all(orders.map(buyerView));
  },

  async detail(ctx: GraphQLContext, orderNo: string, accessKey?: string | null) {
    return buyerView(await ownedOrder(ctx, orderNo, accessKey));
  },

  /** A guest's "where is my order": the order number plus the email or phone it was placed with. */
  async track(orderNo: string, contact: string) {
    const order = await ProductOrderModel.findOne({ ...PET_STORE, order_no: String(orderNo ?? '').trim() });
    const given = String(contact ?? '').trim().toLowerCase();
    const digits = given.replaceAll(/\D/g, '');
    const matches =
      !!order &&
      !!given &&
      (order.buyer_email.toLowerCase() === given ||
        (digits.length >= 10 && String(order.buyer_phone ?? '').replaceAll(/\D/g, '').endsWith(digits.slice(-10))));
    if (!matches) notFound('We could not find an order with those details');
    return buyerView(order);
  },

  async cancelMine(ctx: GraphQLContext, orderNo: string, reason: string, accessKey?: string | null) {
    const order = await ownedOrder(ctx, orderNo, accessKey);
    await cancelOrder(order, { by: 'CUSTOMER', byName: order.buyer_name, reason, refundMode: 'ORIGINAL' });
    return buyerView(order);
  },

  table(query?: TableQueryInput | null) {
    return runTableQuery<IProductOrder>(ProductOrderModel, { ...PET_STORE }, query, STORE_ORDER_TABLE).then(
      ({ docs, total, page, page_size }) => ({ rows: docs.map(productOrderService.toPub), total, page, page_size })
    );
  },

  async adminDetail(id: string) {
    const order = await adminOrder(id);
    const [payment, returns, orderCount] = await Promise.all([
      PaymentModel.findById(order.payment_id),
      StoreReturnModel.find({ order_id: order._id }).sort({ created_at: -1 }).lean(),
      ProductOrderModel.countDocuments({ ...PET_STORE, buyer_email: order.buyer_email }),
    ]);
    const meta = (payment?.metadata ?? {}) as Record<string, any>;
    return {
      order: productOrderService.toPub(order),
      payment: payment
        ? {
            id: String(payment._id),
            payment_id: payment.payment_id,
            invoice_no: payment.invoice_no ?? '',
            status: payment.status,
            gateway: payment.gateway,
            total: payment.total,
            coupon_code: payment.coupon_code ?? '',
            coupon_discount: payment.coupon_discount ?? 0,
            coins_redeemed: payment.coins_redeemed ?? 0,
            prepaid_discount: Number(meta.store?.prepaid_discount) || 0,
            cod_fee: Number(meta.store?.cod_fee) || 0,
            refunded_amount: Number(meta.refunded_amount) || 0,
            paid_at: payment.paid_at?.toISOString() ?? null,
          }
        : null,
      return_ids: returns.map((r) => String(r._id)),
      customer_order_count: orderCount,
      is_guest: !order.buyer_id,
    };
  },

  async updateStatus(id: string, status: FulfilmentStatus, note: string) {
    const order = await adminOrder(id);
    if (status === 'CANCELLED') badInput('Use Cancel order — it also handles the stock and the refund');
    return productOrderService.advanceStatus(String(order._id), status, note);
  },

  async addNote(ctx: GraphQLContext, id: string, text: string) {
    const clean = String(text ?? '').trim();
    if (!clean) badInput('Write the note first');
    const user = requireAuth(ctx);
    const author = await UserModel.findById(user.id).select('profile.first_name profile.last_name auth.email').lean();
    const name =
      `${author?.profile?.first_name ?? ''} ${author?.profile?.last_name ?? ''}`.trim() || author?.auth?.email || '';
    const order = await adminOrder(id);
    order.notes.push({ text: clean.slice(0, 2000), by_id: user.id, by_name: name, at: new Date() } as any);
    await order.save();
    return productOrderService.toPub(order);
  },

  async adminCancel(ctx: GraphQLContext, id: string, reason: string, refundMode: StoreRefundMode) {
    const user = requireAuth(ctx);
    const order = await adminOrder(id);
    await cancelOrder(order, { by: 'ADMIN', byName: user.email ?? user.id, reason, refundMode });
    return productOrderService.toPub(order);
  },

  async markCodCollected(id: string) {
    const order = await adminOrder(id);
    if (order.payment_method !== 'COD') badInput('This order was paid online');
    if (!order.cod_collected_at) await markCodCollected(order);
    return productOrderService.toPub(order);
  },

  async createShipment(id: string) {
    const order = await adminOrder(id);
    return productOrderService.createShipmentForOrder(String(order._id));
  },

  async refreshTracking(id: string) {
    const order = await adminOrder(id);
    return productOrderService.refreshTrackingById(String(order._id));
  },

  /** A customer's order history, for the portal's customer page. */
  async forCustomer(email: string) {
    const orders = await ProductOrderModel.find({ ...PET_STORE, buyer_email: String(email ?? '').toLowerCase() })
      .sort({ created_at: -1 })
      .limit(200);
    return orders.map(productOrderService.toPub);
  },
};
