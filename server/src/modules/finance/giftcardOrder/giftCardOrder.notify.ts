import { UserModel } from '@modules/access/user/user.model';
import { notifyEvent } from '@services/notify/notify.service';
import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';
import type { GiftCardFulfilmentStatus, IGiftCardOrder } from './giftCardOrder.model';

/**
 * The buyer's email + WhatsApp for every moment of a gift card order: confirmed
 * (payment received), dispatched with its tracking number, out for delivery, a
 * failed delivery attempt, and delivered. Each goes through `notifyEvent`, so
 * both channels share one set of values and one dedupe key per order + moment —
 * a replayed webhook or a retried payment step never messages twice.
 *
 * The WhatsApp templates themselves are created and approved in the
 * Communications portal (AiSensy campaigns named in wa-events.ts).
 */

export type GiftCardOrderEvent =
  | 'GIFT_CARD_ORDER_CONFIRMED'
  | 'GIFT_CARD_ORDER_SHIPPED'
  | 'GIFT_CARD_ORDER_OUT_FOR_DELIVERY'
  | 'GIFT_CARD_ORDER_DELIVERED'
  | 'GIFT_CARD_ORDER_DELIVERY_FAILED';

/** The courier moves a buyer hears about; every other move is console-only. */
export const EVENT_BY_STATUS: Partial<Record<GiftCardFulfilmentStatus, GiftCardOrderEvent>> = {
  SHIPPED: 'GIFT_CARD_ORDER_SHIPPED',
  OUT_FOR_DELIVERY: 'GIFT_CARD_ORDER_OUT_FOR_DELIVERY',
  DELIVERED: 'GIFT_CARD_ORDER_DELIVERED',
  NDR: 'GIFT_CARD_ORDER_DELIVERY_FAILED',
};

const money = (order: IGiftCardOrder, value: number) => `${order.currency_symbol}${value.toFixed(2)}`;

/** Where the buyer reads the order and its tracking, on mWeb or in the app. */
export async function giftCardOrderUrl(order: Pick<IGiftCardOrder, 'order_no'>): Promise<string> {
  const { appUrl } = await getUrlConfigs();
  return `${appUrl.replace(/\/+$/, '')}/gift-cards/orders/${encodeURIComponent(order.order_no)}`;
}

/** Template placeholders, in the order each campaign declares them. */
export function paramsFor(event: GiftCardOrderEvent, order: IGiftCardOrder, name: string, link: string): string[] {
  if (event === 'GIFT_CARD_ORDER_CONFIRMED') return [name, order.order_no, money(order, order.total), link];
  if (event === 'GIFT_CARD_ORDER_SHIPPED') {
    return [name, order.order_no, order.shipment?.courier_name ?? '', order.shipment?.awb ?? '', link];
  }
  return [name, order.order_no, link];
}

/** Email-only lines — what a WhatsApp template has no room for. */
function emailVars(order: IGiftCardOrder): Record<string, string> {
  return {
    quantity: String(order.quantity),
    card_amount: money(order, order.amount),
    delivery: order.delivery_mode === 'PHYSICAL' ? 'Printed card, by courier' : 'Email',
  };
}

/** Message the buyer about one moment of their order. Never throws. */
export async function notifyGiftCardOrder(order: IGiftCardOrder, event: GiftCardOrderEvent): Promise<void> {
  try {
    const user = await UserModel.findById(order.user_id)
      .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
      .lean();
    const name = user?.profile?.first_name || order.buyer_name || 'there';
    const link = await giftCardOrderUrl(order);
    await notifyEvent({
      event,
      entityId: `${String(order._id)}:${event}`,
      user,
      email: user?.auth?.email || order.buyer_email,
      name,
      params: paramsFor(event, order, name, link),
      vars: emailVars(order),
    });
  } catch (error) {
    logs.server.warn('giftCardOrder', 'notify', { error, order_no: order.order_no, event });
  }
}

/** The courier moved the parcel: tell the buyer when it is a move they wait for. */
export async function notifyGiftCardStatus(order: IGiftCardOrder): Promise<void> {
  const event = EVENT_BY_STATUS[order.fulfilment_status];
  if (event) await notifyGiftCardOrder(order, event);
}
