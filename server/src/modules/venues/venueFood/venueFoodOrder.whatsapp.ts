import type { Types } from 'mongoose';
import { getUrlConfigs } from '@config/url-configs';
import { UserModel } from '@modules/access/user/user.model';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { logs } from '@observability/log';
import { VenueFoodOrderModel, type IVenueFoodOrder } from './venueFoodOrder.model';
import { FOOD_LOG, rupees } from './venueFoodOrder.shared';

/**
 * The WhatsApp side of a venue food order: the guest hears that the order is
 * placed, ready, served (with the link to rate it) or cancelled, and the venue
 * owner hears about every paid order and every rating.
 *
 * A signed-in guest is messaged through their account, so their WhatsApp
 * number and opt-out apply; anyone else at the number they ordered with.
 * Every link carries utm tags naming the message it came from, so the visits
 * it brings back are counted against that message.
 *
 * Nothing here may fail the order: each send is best effort and logged.
 */

/** The account fields the send funnel reads: the number AND the preferences. */
const WA_ACCOUNT_FIELDS = 'profile.first_name profile.last_name auth.email auth.phone communication.whatsapp';

/** A guest's 10-digit mobile as AiSensy dials it (country code first). */
export const foodGuestNumber = (phone: string): string => {
  const digits = phone.replaceAll(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
};

const trimBase = (url: string) => url.replace(/\/$/, '');

const money = (order: IVenueFoodOrder) => `${order.currency_symbol ?? ''}${rupees(order.total_paise).toFixed(2)}`;

/** The guest's own order page, tagged with the campaign that sent them there. */
async function orderLink(order: IVenueFoodOrder, campaign: string, feedback = false): Promise<string> {
  const { mwebUrl } = await getUrlConfigs();
  const withKey = await VenueFoodOrderModel.findById(order._id).select('+access_key').lean();
  const query = new URLSearchParams({
    key: withKey?.access_key ?? '',
    utm_source: 'whatsapp',
    utm_medium: 'automation',
    utm_campaign: campaign,
  });
  if (feedback) query.set('feedback', '1');
  return `${trimBase(mwebUrl)}/venue/${order.venue_id.toHexString()}/food-order/${order._id.toHexString()}?${query.toString()}`;
}

async function boardLink(): Promise<string> {
  const { partnersUrl } = await getUrlConfigs();
  return `${trimBase(partnersUrl)}/venues/food-orders`;
}

const guestAccount = (userId: Types.ObjectId | null) =>
  userId ? UserModel.findById(userId).select(WA_ACCOUNT_FIELDS).lean() : null;

/** Who a guest message goes to: the account when the guest was signed in, else the number they typed. */
async function guestTo(order: IVenueFoodOrder) {
  const user = await guestAccount(order.user_id);
  return {
    entityId: order._id.toHexString(),
    user,
    destination: user ? null : foodGuestNumber(order.customer_phone),
    name: order.customer_name,
  };
}

/** The venue owner's account, or null when the venue has none to message. */
async function ownerOf(order: IVenueFoodOrder) {
  const venue = await VenueModel.findById(order.venue_id).select('owner_user_id owner_name').lean();
  if (!venue?.owner_user_id) return null;
  const user = await UserModel.findById(venue.owner_user_id).select(WA_ACCOUNT_FIELDS).lean();
  if (!user) return null;
  const name = venue.owner_name || `${user.profile?.first_name ?? ''} ${user.profile?.last_name ?? ''}`.trim();
  return { user, name };
}

async function safely(operation: string, order: IVenueFoodOrder, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    logs.server.warn(FOOD_LOG, operation, { error, orderNo: order.order_no, msg: 'WhatsApp message not sent' });
  }
}

/** The order is paid: the guest gets their order link (and invoice), the owner a new-order nudge. */
export async function whatsappFoodOrderPaid(order: IVenueFoodOrder) {
  await safely('whatsappPaid', order, async () => {
    const to = await guestTo(order);
    await whatsappService.send({
      ...to,
      event: 'VENUE_FOOD_ORDER_PLACED',
      params: [
        order.customer_name,
        order.order_no,
        order.venue_name,
        money(order),
        await orderLink(order, 'venue_food_order_placed'),
      ],
    });
  });
  await safely('whatsappOwnerNewOrder', order, async () => {
    const owner = await ownerOf(order);
    if (!owner) return;
    await whatsappService.send({
      event: 'VENUE_FOOD_ORDER_RECEIVED',
      entityId: order._id.toHexString(),
      user: owner.user,
      name: owner.name,
      params: [owner.name, order.order_no, order.venue_name, money(order), order.table_label || '—', await boardLink()],
    });
  });
}

/** The kitchen moved the order: the guest is told when it is ready, and asked to rate it once served. */
export async function whatsappFoodOrderStatus(order: IVenueFoodOrder) {
  if (order.status === 'READY') {
    await safely('whatsappReady', order, async () => {
      const to = await guestTo(order);
      await whatsappService.send({
        ...to,
        event: 'VENUE_FOOD_ORDER_READY',
        params: [
          order.customer_name,
          order.order_no,
          order.venue_name,
          await orderLink(order, 'venue_food_order_ready'),
        ],
      });
    });
  }
  if (order.status === 'SERVED') {
    await safely('whatsappServed', order, async () => {
      const to = await guestTo(order);
      await whatsappService.send({
        ...to,
        event: 'VENUE_FOOD_ORDER_SERVED',
        params: [
          order.customer_name,
          order.order_no,
          order.venue_name,
          await orderLink(order, 'venue_food_order_served', true),
        ],
      });
    });
  }
}

/** The venue cancelled a paid order: the guest is told, with what is coming back. */
export async function whatsappFoodOrderCancelled(order: IVenueFoodOrder) {
  await safely('whatsappCancelled', order, async () => {
    const to = await guestTo(order);
    await whatsappService.send({
      ...to,
      event: 'VENUE_FOOD_ORDER_CANCELLED',
      params: [
        order.customer_name,
        order.order_no,
        order.venue_name,
        money(order),
        await orderLink(order, 'venue_food_order_cancelled'),
      ],
    });
  });
}

/** A guest rated their order: the owner is told the stars, with the board to read the rest. */
export async function whatsappFoodFeedbackReceived(order: IVenueFoodOrder) {
  await safely('whatsappOwnerFeedback', order, async () => {
    const owner = await ownerOf(order);
    if (!owner || !order.feedback) return;
    await whatsappService.send({
      event: 'VENUE_FOOD_FEEDBACK_RECEIVED',
      entityId: order._id.toHexString(),
      user: owner.user,
      name: owner.name,
      params: [owner.name, order.order_no, order.venue_name, `${order.feedback.rating}/5`, await boardLink()],
    });
  });
}
