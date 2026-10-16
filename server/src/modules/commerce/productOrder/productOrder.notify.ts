import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { UserModel } from '@modules/access/user/user.model';
import { notifyEvent } from '@services/notify/notify.service';
import type { FulfilmentStatus, IOrderRefund, IProductOrder } from './productOrder.model';

/**
 * The pod-shop buyer's email + WhatsApp for what happens to an order after it
 * is placed: a cancellation (with our apology and the refund), and each step
 * of a return. Never throws — a message that cannot go out is logged (and the
 * email/WhatsApp consoles keep their own FAILED rows), never a reason to undo
 * the cancellation or return it reports.
 */

const money = (symbol: string, n: number) => `${symbol || '₹'}${Number(n || 0).toFixed(2)}`;

async function ordersUrl() {
  const { mwebUrl } = await getUrlConfigs();
  return `${mwebUrl.replace(/\/+$/, '')}/orders`;
}

/** The buyer's account: the number AND the preference fields the WhatsApp funnel reads. */
const buyerOf = (order: IProductOrder) =>
  order.buyer_id
    ? UserModel.findById(order.buyer_id)
        .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
        .lean()
    : null;

/** What the buyer is told comes back: cash, coins, or both. */
export function refundText(order: IProductOrder, refund: IOrderRefund) {
  const parts: string[] = [];
  if (refund.amount > 0) parts.push(money(order.currency_symbol, refund.amount));
  if (refund.coins > 0) parts.push(`${refund.coins} Duncit Coins`);
  return parts.join(' + ') || money(order.currency_symbol, 0);
}

/** Sorry — your order was cancelled, and here is your money. */
export async function notifyOrderCancelled(order: IProductOrder) {
  try {
    const user = await buyerOf(order);
    const name = order.buyer_name || user?.profile?.first_name || '';
    const refund = refundText(order, order.refund);
    const url = await ordersUrl();
    await sendEmail({
      to: order.buyer_email || user?.auth?.email || '',
      subject: `We're sorry — your order ${order.order_no} was cancelled`,
      template: 'pod-shop-order-cancelled',
      category: 'transactional',
      vars: {
        name,
        order_no: order.order_no,
        items: order.line_items.map((l) => `${l.name}${l.variant_label ? ` (${l.variant_label})` : ''} × ${l.qty}`).join(', '),
        refund_amount: refund,
        reason: order.cancel_reason || '—',
        orders_url: url,
      },
    });
    await whatsappService.send({
      event: 'POD_SHOP_ORDER_CANCELLED',
      entityId: String(order._id),
      user,
      name,
      params: [name, order.order_no, refund, url],
    });
  } catch (error) {
    logs.server.error('productOrder', 'notifyOrderCancelled', { error, order_no: order.order_no });
  }
}

export interface ReturnNotice {
  id: string;
  return_no: string;
  status: string;
  /** Human words for the status, e.g. "approved — a courier will collect it". */
  status_label: string;
  note: string;
  refund: IOrderRefund;
}

/**
 * The moves a pod-shop buyer waits for. Every other status — an AWB being
 * assigned, a pickup being booked — is the seller's business, and buzzing the
 * buyer's phone for it is the noise that teaches people to mute us.
 */
const EVENT_BY_STATUS: Partial<Record<FulfilmentStatus, string>> = {
  SHIPPED: 'POD_SHOP_ORDER_SHIPPED',
  OUT_FOR_DELIVERY: 'POD_SHOP_ORDER_OUT_FOR_DELIVERY',
  DELIVERED: 'POD_SHOP_ORDER_DELIVERED',
};

/** Who is carrying it, when ShipRocket has not said yet. */
const COURIER_FALLBACK = 'our delivery partner';

/**
 * Shipped, out for delivery, delivered — on WhatsApp and email from one set of
 * values. Pod-shop buyers used to hear nothing between paying and the parcel
 * turning up. Keyed on the order AND the status, so each move is told once
 * however many tracking pulls report it.
 */
export async function notifyOrderStatus(order: IProductOrder) {
  const event = EVENT_BY_STATUS[order.fulfilment_status];
  if (!event) return;
  try {
    const user = await buyerOf(order);
    const name = order.buyer_name || user?.profile?.first_name || 'there';
    const url = await ordersUrl();
    const params =
      event === 'POD_SHOP_ORDER_SHIPPED'
        ? [name, order.order_no, order.shiprocket?.courier_name || COURIER_FALLBACK, url]
        : [name, order.order_no, url];
    await notifyEvent({
      event,
      entityId: `${String(order._id)}:${order.fulfilment_status}`,
      user,
      name,
      params,
      email: order.buyer_email || user?.auth?.email || '',
    });
  } catch (error) {
    logs.server.error('productOrder', 'notifyOrderStatus', { error, order_no: order.order_no });
  }
}

/** One step of a pod-shop return: requested, approved, rejected, received, refunded. */
export async function notifyReturnUpdate(order: IProductOrder, ret: ReturnNotice) {
  try {
    const user = await buyerOf(order);
    const name = order.buyer_name || user?.profile?.first_name || '';
    const url = await ordersUrl();
    await sendEmail({
      to: order.buyer_email || user?.auth?.email || '',
      subject: `Your return ${ret.return_no}: ${ret.status_label}`,
      template: 'pod-shop-return-update',
      category: 'transactional',
      vars: {
        name,
        return_no: ret.return_no,
        order_no: order.order_no,
        status: ret.status_label,
        note: ret.note || '—',
        refund_amount: ret.status === 'REFUNDED' ? refundText(order, ret.refund) : '—',
        orders_url: url,
      },
    });
    await whatsappService.send({
      event: 'POD_SHOP_RETURN_UPDATE',
      entityId: `${ret.id}:${ret.status}`,
      user,
      name,
      params: [name, ret.return_no, ret.status_label, url],
    });
  } catch (error) {
    logs.server.error('productOrder', 'notifyReturnUpdate', { error, return_no: ret.return_no });
  }
}
