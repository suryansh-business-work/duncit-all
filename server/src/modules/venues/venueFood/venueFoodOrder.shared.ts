import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import type { RazorpayKeys } from '@modules/finance/payment/razorpay.gateway';
import { sameSecret } from '@modules/commerce/store/store.shared';
import { PartnerIntegrationModel } from '@modules/venues/ecommBrand/partnerIntegration.model';
import { VenueModel, type IVenue } from '@modules/venues/venue/venue.model';
import type { IVenueFoodOrder } from './venueFoodOrder.model';

/** Small pieces every part of venue food ordering shares: its error shapes, the venue's keys, and what an order looks like outside. */

export const FOOD_LOG = 'venue-food';

export function fail(code: string, message: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

export const badInput = (message: string): never => fail('BAD_USER_INPUT', message);

/** The venue cannot take an order right now — the menu page reads this code and shows the menu without a cart. */
export const orderingClosed = (message = 'This venue is not taking food orders right now'): never =>
  fail('FOOD_ORDERING_CLOSED', message);

export const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const objectId = (id: unknown, message: string) => {
  const value = text(id);
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : badInput(message);
};

/** The venue an operator may run the board — and the coupons — for: its owner, or a venues-console editor. */
export async function managedVenue(userId: string, isAdmin: boolean, venueId: string) {
  const venue = await VenueModel.findById(objectId(venueId, 'Invalid venue id')).select('owner_user_id');
  if (!venue) return fail('NOT_FOUND', 'Venue not found');
  if (!isAdmin && venue.owner_user_id?.toHexString() !== userId) fail('FORBIDDEN', 'Not your venue');
  return venue as Pick<IVenue, '_id' | 'owner_user_id'>;
}

/**
 * The keys of the owner's saved Razorpay connection an order is charged on.
 * Read fresh every time, so keys the owner rotates on the Integrations page
 * are the ones the next verify, reconcile or refund signs with.
 */
export async function razorpayKeysFor(integrationId: Types.ObjectId): Promise<RazorpayKeys> {
  const connection = await PartnerIntegrationModel.findOne({ _id: integrationId, provider: 'RAZORPAY' })
    .select('integrations.razorpay.key_id integrations.razorpay.key_secret')
    .lean();
  const keyId = connection?.integrations?.razorpay?.key_id ?? '';
  const keySecret = connection?.integrations?.razorpay?.key_secret ?? '';
  if (!keyId || !keySecret) return orderingClosed('The payment account of this venue is not available right now');
  return { keyId, keySecret };
}

/** Who may read or pay an order: whoever holds its key, or the account that placed it. */
export function assertOrderAccess(ctx: GraphQLContext, order: IVenueFoodOrder, accessKey?: string | null) {
  if (accessKey && sameSecret(accessKey, order.access_key ?? '')) return;
  if (order.user_id && ctx.user?.id && order.user_id.toHexString() === ctx.user.id) return;
  fail('FORBIDDEN', 'This order link is not valid');
}

export const rupees = (paise: number) => paise / 100;

export const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null);

export const toFoodOrderPub = (order: IVenueFoodOrder) => ({
  id: order._id.toHexString(),
  order_no: order.order_no,
  venue_id: order.venue_id.toHexString(),
  venue_name: order.venue_name ?? '',
  customer_name: order.customer_name,
  customer_phone: order.customer_phone,
  table_label: order.table_label ?? '',
  note: order.note ?? '',
  items: (order.lines ?? []).map((line) => ({
    item_id: line.item_id.toHexString(),
    name: line.name,
    diet: line.diet,
    unit_price: rupees(line.unit_paise),
    quantity: line.quantity,
    line_total: rupees(line.line_paise),
  })),
  subtotal: rupees(order.subtotal_paise),
  discount_pct: order.discount_pct ?? 0,
  discount_amount: rupees(order.discount_paise ?? 0),
  // An order placed before coupons existed carries none of the three.
  coupon_code: order.coupon_code || null,
  coupon_pct: order.coupon_pct ?? 0,
  coupon_discount_amount: rupees(order.coupon_discount_paise ?? 0),
  total: rupees(order.total_paise),
  currency_symbol: order.currency_symbol ?? '',
  status: order.status,
  payment_status: order.payment_status,
  paid_at: iso(order.paid_at),
  cancelled_at: iso(order.cancelled_at),
  cancel_reason: order.cancel_reason ?? '',
  created_at: iso(order.created_at) ?? '',
});

export type FoodOrderPub = ReturnType<typeof toFoodOrderPub>;
