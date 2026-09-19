import type { FulfilmentStatus, IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import { UserModel } from '@modules/access/user/user.model';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { orderUrlFor } from './store.emails';

/**
 * The buyer's WhatsApp for the three moves they wait for: shipped, out for
 * delivery, delivered. The email for every move goes out beside it
 * (`mailOrderUpdate`); these are the ones worth a phone buzz.
 *
 * A signed-in buyer is messaged through their account, so their WhatsApp
 * number and opt-out apply; a guest at the number they checked out with.
 */
const EVENT_BY_STATUS: Partial<Record<FulfilmentStatus, string>> = {
  SHIPPED: 'STORE_ORDER_SHIPPED',
  OUT_FOR_DELIVERY: 'STORE_ORDER_OUT_FOR_DELIVERY',
  DELIVERED: 'STORE_ORDER_DELIVERED',
};

/** A guest's checkout number as AiSensy dials it (country code first). */
function guestNumber(order: IProductOrder): string {
  const digits = String(order.shipping_address?.phone || order.buyer_phone || '').replaceAll(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function whatsappOrderUpdate(order: IProductOrder) {
  const event = EVENT_BY_STATUS[order.fulfilment_status];
  if (!event) return;
  // The number AND the preference fields are selected: the send funnel reads both.
  const user = order.buyer_id
    ? await UserModel.findById(order.buyer_id)
        .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
        .lean()
    : null;
  const name = order.buyer_name || order.shipping_address?.name || '';
  const link = await orderUrlFor(order);
  const params =
    event === 'STORE_ORDER_SHIPPED'
      ? [name, order.order_no, order.shiprocket?.courier_name ?? '', order.shiprocket?.awb ?? '', link]
      : [name, order.order_no, link];
  await whatsappService.send({
    event,
    entityId: String(order._id),
    user,
    destination: user ? null : guestNumber(order),
    name,
    params,
  });
}
