import { ProductOrderModel, type FulfilmentStatus, type IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import type { IPayment } from '@modules/finance/payment/payment.model';
import { UserModel } from '@modules/access/user/user.model';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { logs } from '@observability/log';
import { orderUrlFor } from './store.emails';

/**
 * The buyer's WhatsApp for the moves they wait for: the order placed, shipped,
 * out for delivery, delivered — and cancelled. The email for every move goes
 * out beside it (`mailOrderUpdate`); these are the ones worth a phone buzz.
 *
 * A signed-in buyer is messaged through their account, so their WhatsApp
 * number and opt-out apply; a guest at the number they checked out with.
 */
const EVENT_BY_STATUS: Partial<Record<FulfilmentStatus, string>> = {
  SHIPPED: 'STORE_ORDER_SHIPPED',
  OUT_FOR_DELIVERY: 'STORE_ORDER_OUT_FOR_DELIVERY',
  DELIVERED: 'STORE_ORDER_DELIVERED',
  CANCELLED: 'STORE_ORDER_CANCELLED',
};

/** A guest's checkout number as AiSensy dials it (country code first). */
function guestNumber(order: IProductOrder): string {
  const digits = String(order.shipping_address?.phone || order.buyer_phone || '').replaceAll(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

/** The recipient's account when there is one — the number AND the preference fields, which the send funnel reads. */
const buyerAccount = (order: IProductOrder) =>
  order.buyer_id
    ? UserModel.findById(order.buyer_id)
        .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
        .lean()
    : null;

/** The template's placeholders for a move, in the order the campaign expects them. */
function paramsFor(event: string, order: IProductOrder, name: string, link: string): string[] {
  if (event === 'STORE_ORDER_SHIPPED') {
    return [name, order.order_no, order.shiprocket?.courier_name ?? '', order.shiprocket?.awb ?? '', link];
  }
  if (event === 'STORE_ORDER_CANCELLED') return [name, order.order_no, order.cancel_reason || '—', link];
  if (event === 'STORE_ORDER_PLACED') {
    return [name, order.order_no, `${order.currency_symbol ?? ''}${Number(order.total ?? 0).toFixed(2)}`, link];
  }
  return [name, order.order_no, link];
}

async function sendFor(event: string, order: IProductOrder) {
  const user = await buyerAccount(order);
  const name = order.buyer_name || order.shipping_address?.name || '';
  const link = await orderUrlFor(order);
  await whatsappService.send({
    event,
    entityId: String(order._id),
    user,
    destination: user ? null : guestNumber(order),
    name,
    params: paramsFor(event, order, name, link),
  });
}

export async function whatsappOrderUpdate(order: IProductOrder) {
  const event = EVENT_BY_STATUS[order.fulfilment_status];
  if (!event) return;
  await sendFor(event, order);
}

/** "Your order is placed" — once the finalizer has turned the payment into orders. Best effort. */
export async function whatsappStoreOrdersPlaced(payment: IPayment) {
  if (!payment.metadata?.store) return;
  const orders = await ProductOrderModel.find({ payment_id: payment._id, channel: 'PET_STORE' });
  for (const order of orders) {
    try {
      await sendFor('STORE_ORDER_PLACED', order);
    } catch (error) {
      logs.server.warn('store', 'whatsappStoreOrdersPlaced', { error, order_no: order.order_no });
    }
  }
}
