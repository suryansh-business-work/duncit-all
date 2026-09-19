import { getUrlConfigs } from '@config/url-configs';
import { sendEmail } from '@services/email/email.service';
import { logs } from '@observability/log';
import { ProductOrderModel, type IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import type { IStoreReturn } from './storeReturn.model';
import type { IStoreCart } from './storeCart.model';

/**
 * Every email the pet store sends after checkout, best-effort: the order, the
 * return or the stock change has already been recorded, and a mailbox outage
 * must never undo it or fail the operator's action.
 */

/** Words for a status, in the order a parcel moves through them. */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Order placed',
  AWAITING_SHIPMENT: 'Being packed',
  AWB_ASSIGNED: 'Ready to ship',
  PICKUP_SCHEDULED: 'Pickup scheduled',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RTO: 'Returning to us',
  RTO_DELIVERED: 'Returned to us',
  NDR: 'Delivery attempt failed',
  LOST: 'Lost in transit',
  FAILED: 'Needs attention',
  READY_FOR_PICKUP: 'Ready for pickup',
  PICKED_UP: 'Picked up',
};

export const RETURN_STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
  PICKUP_SCHEDULED: 'Pickup scheduled',
  RECEIVED: 'Received',
  REFUNDED: 'Refunded',
  CLOSED: 'Closed',
};

/**
 * Every status a buyer can read on their order page is one they are written
 * to about — placed, packed, ready, picked up, shipped, out for delivery,
 * delivered, and the ones that go wrong. Only a status the label table does
 * not know is skipped, because there would be nothing to tell them.
 */
const NOTIFY_STATUSES = new Set(Object.keys(ORDER_STATUS_LABEL));

const firstName = (name: string) => String(name ?? '').trim().split(/\s+/)[0] || 'there';

async function storeBase() {
  const { ecommUrl } = await getUrlConfigs();
  return ecommUrl.replace(/\/+$/, '');
}

/** The buyer's way back to an order: their account page, or a guest's keyed link. */
export async function orderUrlFor(order: IProductOrder): Promise<string> {
  const base = await storeBase();
  if (order.buyer_id) return `${base}/account/orders/${encodeURIComponent(order.order_no)}`;
  const withKey = await ProductOrderModel.findById(order._id).select('+access_key').lean();
  const key = withKey?.access_key ?? '';
  return `${base}/track?order=${encodeURIComponent(order.order_no)}&key=${encodeURIComponent(key)}`;
}

export async function mailOrderUpdate(order: IProductOrder) {
  if (order.channel !== 'PET_STORE' || !NOTIFY_STATUSES.has(order.fulfilment_status)) return;
  const to = order.buyer_email || order.shipping_address?.email || '';
  if (!to) return;
  try {
    const label = ORDER_STATUS_LABEL[order.fulfilment_status] ?? order.fulfilment_status;
    await sendEmail({
      to,
      subject: `Your order ${order.order_no} — ${label}`,
      template: 'store-order-update',
      category: 'transactional',
      vars: {
        name: firstName(order.buyer_name),
        order_no: order.order_no,
        status_label: label,
        items: order.line_items.map((l) => `${l.name} × ${l.qty}`).join(', '),
        courier: order.shiprocket?.courier_name || '—',
        awb: order.shiprocket?.awb || '—',
        order_url: await orderUrlFor(order),
      },
    });
  } catch (error) {
    logs.server.warn('store', 'mailOrderUpdate', { error, order_no: order.order_no });
  }
}

export async function mailReturnUpdate(ret: IStoreReturn, order: IProductOrder | null, amountText: string) {
  if (!ret.buyer_email) return;
  try {
    const label = RETURN_STATUS_LABEL[ret.status] ?? ret.status;
    await sendEmail({
      to: ret.buyer_email,
      subject: `Your return ${ret.return_no} — ${label}`,
      template: 'store-return-update',
      category: 'transactional',
      vars: {
        name: firstName(ret.buyer_name),
        return_no: ret.return_no,
        order_no: ret.order_no,
        status_label: label,
        amount: amountText,
        note: ret.admin_note || '—',
        order_url: order ? await orderUrlFor(order) : await storeBase(),
      },
    });
  } catch (error) {
    logs.server.warn('store', 'mailReturnUpdate', { error, return_no: ret.return_no });
  }
}

export async function mailBackInStock(email: string, productName: string, slug: string) {
  try {
    await sendEmail({
      to: email,
      subject: `${productName} is back in stock`,
      template: 'store-back-in-stock',
      category: 'notification',
      vars: { name: 'there', product_name: productName, product_url: `${await storeBase()}/p/${slug}` },
    });
    return true;
  } catch (error) {
    logs.server.warn('store', 'mailBackInStock', { error, email });
    return false;
  }
}

export async function mailCartReminder(cart: IStoreCart, items: string, name: string) {
  await sendEmail({
    to: cart.email,
    subject: 'Your pet store cart is waiting',
    template: 'store-cart-reminder',
    category: 'marketing',
    vars: { name: firstName(name), items, cart_url: `${await storeBase()}/cart` },
  });
}
