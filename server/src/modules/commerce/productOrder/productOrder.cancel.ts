import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ProductOrderModel, type FulfilmentStatus, type IProductOrder } from './productOrder.model';
import { issueRefund, retryRefund } from './productOrder.refund';
import { notifyOrderCancelled } from './productOrder.notify';

/**
 * Calling off a POD-SHOP order: the Products portal's force cancel, and a
 * partner's "cancel and refund" deletion request once approved. The pet store
 * has its own (store.order.service) — different shop, different rules (rule 65).
 *
 * Order of steps: claim the order (so two operators cannot both cancel it),
 * stop the courier, put the stock back, refund in full, then say sorry.
 */

/** States an order is finished in — nothing left to cancel or wait for. */
export const CLOSED_STATUSES: FulfilmentStatus[] = ['DELIVERED', 'PICKED_UP', 'CANCELLED', 'RTO_DELIVERED'];

/** Before the courier has the parcel: a refused courier cancel here means the parcel would still ship. */
const BEFORE_PICKUP = new Set<FulfilmentStatus>([
  'PENDING',
  'AWAITING_SHIPMENT',
  'AWB_ASSIGNED',
  'PICKUP_SCHEDULED',
  'READY_FOR_PICKUP',
  'FAILED',
]);

/** A pod-shop order still running — the filter deletion checks and the warning count by. */
export const openPodShopOrderFilter = (extra: Record<string, unknown> = {}) => ({
  channel: 'POD_SHOP',
  cancelled_at: null,
  fulfilment_status: { $nin: CLOSED_STATUSES },
  ...extra,
});

export type CancelSource = 'ADMIN' | 'DELETION';

export interface CancelInput {
  source: CancelSource;
  /** Who pressed it (email or id) — written on the order and in the logs. */
  actor: string;
  reason: string;
}

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_REQUEST' } });
}

const INITIATED_BY: Record<CancelSource, string> = {
  ADMIN: 'POD_SHOP_ADMIN_CANCEL',
  DELETION: 'POD_SHOP_DELETION_CANCEL',
};

/** Stop the courier. Answers a warning when the parcel is already moving and cannot be stopped. */
async function stopCourier(order: IProductOrder, status: FulfilmentStatus): Promise<string> {
  if (!order.shiprocket?.order_id) return '';
  const { withShiprocketAccount } = await import('@modules/commerce/shiprocket/shiprocket.client');
  const { accountForOrder } = await import('@modules/commerce/shiprocket/shiprocket.shipment');
  const { cancelOrders } = await import('@modules/commerce/shiprocket/shiprocket.gateway');
  try {
    await withShiprocketAccount(await accountForOrder(order), () => cancelOrders([order.shiprocket.order_id]));
    return '';
  } catch (error) {
    logs.server.error('productOrder', 'stopCourier', { error, order_no: order.order_no });
    if (BEFORE_PICKUP.has(status)) throw error;
    return `ShipRocket could not stop shipment ${order.shiprocket.awb || order.shiprocket.order_id} (already ${status}) — arrange a return to origin with the courier.`;
  }
}

/** Put the units back on the product (and its variant) and off the pod's sold count. */
async function restockPodShop(order: IProductOrder) {
  for (const item of order.line_items) {
    const qty = Math.floor(Number(item.qty) || 0);
    if (qty <= 0) continue;
    const inc: Record<string, number> = { inventory_count: qty };
    const options: Record<string, unknown> = {};
    if (item.variant_id && Types.ObjectId.isValid(item.variant_id)) {
      inc['variants.$[v].inventory_count'] = qty;
      options.arrayFilters = [{ 'v._id': new Types.ObjectId(item.variant_id) }];
    }
    await InventoryProductModel.updateOne({ _id: item.product_id }, { $inc: inc }, options);
    if (order.pod_id) {
      await PodModel.updateOne(
        { _id: order.pod_id, product_requests: { $elemMatch: { product_id: item.product_id, sold_count: { $gte: qty } } } },
        { $inc: { 'product_requests.$.sold_count': -qty } }
      );
    }
  }
}

export const refundRequestFor = (order: IProductOrder, reason: string, initiatedBy: string) => ({
  paymentId: order.payment_id,
  gross: order.total,
  receipt: order.order_no,
  reason,
  initiatedBy,
});

/** Cancel one pod-shop order with a full refund. Answers the cancelled order. */
export async function cancelPodShopOrder(orderId: string, input: CancelInput): Promise<IProductOrder> {
  const reason = String(input.reason ?? '').trim().slice(0, 500);
  if (!reason) bad('Give the reason — the buyer is told it');
  if (!Types.ObjectId.isValid(orderId)) bad('Order not found');
  const current = await ProductOrderModel.findById(orderId);
  if (!current) throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
  if (current.channel !== 'POD_SHOP') bad('Pet-store orders are cancelled from the E-Commerce portal');
  const status = current.fulfilment_status;
  const cancelledBy = `${input.source}:${input.actor}`;

  // The claim: only one caller gets past this for an open order.
  const order = await ProductOrderModel.findOneAndUpdate(
    { _id: current._id, ...openPodShopOrderFilter() },
    { $set: { cancelled_at: new Date(), cancel_reason: reason, cancelled_by: cancelledBy } },
    { new: true }
  );
  if (!order) bad('This order is already delivered or cancelled');

  let warning = '';
  try {
    warning = await stopCourier(order, status);
  } catch (error) {
    await ProductOrderModel.updateOne(
      { _id: current._id },
      { $set: { cancelled_at: null, cancel_reason: '', cancelled_by: '' } }
    );
    bad(`The courier could not cancel this shipment, so the order was left as it is: ${(error as Error).message}`);
  }

  const doc = order;
  doc.fulfilment_status = 'CANCELLED';
  doc.tracking_events.push({ status: 'CANCELLED', code: 0, location: '', note: reason, at: new Date() });
  if (warning) doc.notes.push({ text: warning, by_id: '', by_name: 'System', at: new Date() });
  await doc.save();
  await restockPodShop(doc);
  await issueRefund(doc, refundRequestFor(doc, `Order ${doc.order_no} cancelled: ${reason}`, INITIATED_BY[input.source]));
  await notifyOrderCancelled(doc);
  logs.server.info('productOrder', 'cancel', {
    order_no: doc.order_no,
    source: input.source,
    actor: input.actor,
    previous_status: status,
    refund_status: doc.refund.status,
    courier_warning: warning || undefined,
  });
  return doc;
}

/** Retry the refund of a cancelled order that Razorpay refused. */
export async function retryOrderRefund(orderId: string) {
  const order = Types.ObjectId.isValid(orderId) ? await ProductOrderModel.findById(orderId) : null;
  if (!order) throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
  if (!order.cancelled_at) bad('Only a cancelled order has a refund to retry');
  const by = order.refund.initiated_by || INITIATED_BY.ADMIN;
  await retryRefund(order, refundRequestFor(order, `Order ${order.order_no} cancelled: ${order.cancel_reason}`, by));
  return order;
}
