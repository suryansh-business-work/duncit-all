import crypto from 'node:crypto';
import type { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import * as gateway from '@modules/finance/payment/razorpay.gateway';
import { updateFoodTaxDefaults } from '@modules/finance/finance/foodTaxDefaults';
import { LocationModel } from '@modules/platform/location/location.model';
import { PartnerIntegrationModel } from '@modules/venues/ecommBrand/partnerIntegration.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueFoodResolvers } from '../../venueFood.resolver';
import { VenueFoodOrderModel } from '../../venueFoodOrder.model';
import { markFoodOrderPaid } from '../../venueFoodOrder.payment';
import { venueFoodOrderService } from '../../venueFoodOrder.service';

/**
 * Cancelling a food order refunds the guest, so a CITY_ADMIN or ZONAL_ADMIN
 * may do it only for a venue in their own city or zones — against the
 * in-memory database, with only Razorpay replaced.
 */
jest.mock('@modules/finance/payment/razorpay.gateway');
const rzp = jest.mocked(gateway);

const guest = { user: null } as unknown as GraphQLContext;
const staff = (user: { roles: string[]; assigned_city?: string; assigned_zones?: string[]; id?: string }) =>
  ({ user: { id: new Types.ObjectId().toHexString(), ...user } }) as unknown as GraphQLContext;

async function location(name: string, zones: string[]) {
  return LocationModel.create({
    location_id: name.toLowerCase(),
    location_name: name,
    country: 'India',
    country_code: 'IN',
    city: name,
    location_image: `https://img/${name}.jpg`,
    location_pincode: '411001',
    location_zones: zones.map((zone_name) => ({ zone_name })),
  });
}

/** A venue in `city` / `locality` with one guest order placed and paid. */
async function paidOrderIn(city: string, locality: string) {
  const loc = await LocationModel.findOne({ location_name: city });
  const owner = new Types.ObjectId();
  const account = await PartnerIntegrationModel.create({
    owner_user_id: owner,
    provider: 'RAZORPAY',
    integrations: { razorpay: { key_id: 'rzp_test_venue', key_secret: 'venue-secret', connected: true } },
  });
  const venue = await VenueModel.create({
    owner_user_id: owner,
    venue_name: `Cafe ${city}`,
    status: 'APPROVED',
    is_active: true,
    location_id: loc?._id ?? null,
    city,
    locality,
    offers_food: true,
    food_menu: [{ name: 'Paneer Tikka', price: 240, diet: 'VEG' }],
    food_ordering: { enabled: true, razorpay_integration_id: account._id, discount_pct: 0 },
  });
  const { order } = await venueFoodOrderService.place(guest, {
    venue_id: venue._id.toHexString(),
    items: [{ item_id: venue.food_menu[0]._id.toHexString(), quantity: 2 }],
    customer_name: 'Asha Rao',
    customer_phone: '9876543210',
    client_key: crypto.randomUUID(),
  });
  await markFoodOrderPaid(new Types.ObjectId(order.id), `pay_${order.id}`);
  return { orderId: order.id, ownerId: owner.toHexString() };
}

const cancel = (orderId: string, ctx: GraphQLContext) =>
  venueFoodResolvers.Mutation.cancelVenueFoodOrder(null, { order_id: orderId, reason: 'Kitchen closed' }, ctx);

async function refusal(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const refused = error as GraphQLError;
    return { code: refused.extensions?.code, message: refused.message };
  }
  throw new Error('Expected the call to be refused');
}

const OUT_OF_SCOPE = { code: 'FORBIDDEN', message: 'This is outside the city or zone you administer' };

beforeAll(async () => {
  await VenueFoodOrderModel.init();
});

beforeEach(async () => {
  await updateFoodTaxDefaults({ tax_mode: 'INCLUSIVE', gst_pct: 5 }, null);
  await location('Pune', ['Pune West', 'Pune East']);
  await location('Delhi', ['Delhi North']);
  let opened = 0;
  rzp.createRazorpayOrder.mockImplementation(async () => {
    opened += 1;
    return { id: `order_rzp_${opened}` };
  });
  rzp.findCapturedPaymentForOrder.mockResolvedValue(null);
  rzp.listRazorpayRefunds.mockResolvedValue([]);
  rzp.createRazorpayRefund.mockImplementation(async (args) => ({
    id: `rfnd_${args.paymentId}`,
    status: 'processed',
    amount: args.amountPaise,
    receipt: args.receipt ?? '',
  }));
});

describe('cancelVenueFoodOrder city / zone scope', () => {
  it("refuses a CITY_ADMIN another city's order and leaves it paid", async () => {
    const { orderId } = await paidOrderIn('Delhi', 'Delhi North');
    const puneAdmin = staff({ roles: ['USER', 'CITY_ADMIN'], assigned_city: 'Pune' });

    expect(await refusal(() => cancel(orderId, puneAdmin))).toEqual(OUT_OF_SCOPE);
    expect(rzp.createRazorpayRefund).not.toHaveBeenCalled();
    expect(await VenueFoodOrderModel.findById(orderId).lean()).toMatchObject({ status: 'PLACED', payment_status: 'PAID' });
  });

  it("lets a CITY_ADMIN cancel and refund their own city's order, whether the city is named or slugged", async () => {
    const first = await paidOrderIn('Pune', 'Pune West');
    const second = await paidOrderIn('Pune', 'Pune East');

    expect(await cancel(first.orderId, staff({ roles: ['USER', 'CITY_ADMIN'], assigned_city: 'Pune' }))).toMatchObject({
      status: 'CANCELLED',
      payment_status: 'REFUNDED',
    });
    expect(await cancel(second.orderId, staff({ roles: ['USER', 'CITY_ADMIN'], assigned_city: 'pune' }))).toMatchObject({
      status: 'CANCELLED',
    });
    expect(rzp.createRazorpayRefund).toHaveBeenCalledTimes(2);
  });

  it('holds a ZONAL_ADMIN to the venue locality, and refuses one with no zones', async () => {
    const west = await paidOrderIn('Pune', 'Pune West');
    const east = await paidOrderIn('Pune', 'Pune East');
    const zonal = staff({ roles: ['USER', 'ZONAL_ADMIN'], assigned_zones: ['Pune West'] });

    expect(await refusal(() => cancel(east.orderId, zonal))).toEqual(OUT_OF_SCOPE);
    expect(await cancel(west.orderId, zonal)).toMatchObject({ status: 'CANCELLED' });
    expect(await refusal(() => cancel(east.orderId, staff({ roles: ['USER', 'ZONAL_ADMIN'], assigned_zones: [] })))).toEqual(
      OUT_OF_SCOPE
    );
  });

  it('refuses a CITY_ADMIN with no city assigned instead of letting them refund anywhere', async () => {
    const { orderId } = await paidOrderIn('Pune', 'Pune West');
    expect(await refusal(() => cancel(orderId, staff({ roles: ['USER', 'CITY_ADMIN'] })))).toEqual(OUT_OF_SCOPE);
  });

  it('leaves SUPER_ADMIN and the venue owner able to refund wherever the venue is', async () => {
    const delhi = await paidOrderIn('Delhi', 'Delhi North');
    const owned = await paidOrderIn('Delhi', 'Delhi North');

    expect(await cancel(delhi.orderId, staff({ roles: ['USER', 'SUPER_ADMIN'] }))).toMatchObject({ status: 'CANCELLED' });
    // An owner who is also a city admin elsewhere still refunds their own venue's orders.
    const ownerAdmin = staff({ id: owned.ownerId, roles: ['USER', 'CITY_ADMIN'], assigned_city: 'Pune' });
    expect(await cancel(owned.orderId, ownerAdmin)).toMatchObject({ status: 'CANCELLED' });
  });
});
