/**
 * The venue's side of a food order and the guest's checkout guards, against
 * the in-memory database: moving a paid order along the kitchen's path, the
 * payment checks, and what placing refuses. Razorpay (the VENUE's own account,
 * never a Duncit Payment), WhatsApp and the URL settings are the only seams
 * replaced.
 */
jest.mock('@modules/finance/payment/razorpay.gateway');
jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({
  whatsappService: { send: jest.fn() },
}));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));

import crypto from 'node:crypto';
import type { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { getUrlConfigs } from '@config/url-configs';
import { makeContext } from '@test/harness';
import * as gateway from '@modules/finance/payment/razorpay.gateway';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { PartnerIntegrationModel } from '@modules/venues/ecommBrand/partnerIntegration.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueFoodOrderModel, type FoodOrderStatus, type FoodPaymentStatus } from '../../venueFoodOrder.model';
import { venueFoodOrderService, type PlaceFoodOrderInput } from '../../venueFoodOrder.service';

const rzp = jest.mocked(gateway);
const send = jest.mocked(whatsappService.send);
const urls = jest.mocked(getUrlConfigs);

const KEY = 'guest-access-key-123';
const guest = makeContext(null);
let seq = 0;

async function makeVenue(over: Record<string, unknown> = {}) {
  const owner = new Types.ObjectId();
  const account = await PartnerIntegrationModel.create({
    owner_user_id: owner,
    provider: 'RAZORPAY',
    integrations: { razorpay: { key_id: 'rzp_test_venue', key_secret: 'venue-secret', connected: true } },
  });
  const venue = await VenueModel.create({
    owner_user_id: owner,
    venue_name: 'Cafe Uno',
    status: 'APPROVED',
    is_active: true,
    offers_food: true,
    food_menu: [
      { name: 'Paneer Tikka', price: 240, diet: 'VEG' },
      { name: 'Masala Chai', price: 60, diet: 'VEG', is_available: false },
    ],
    food_ordering: { enabled: true, razorpay_integration_id: account._id },
    ...over,
  });
  return {
    venueId: venue._id,
    ownerId: owner.toHexString(),
    integrationId: account._id,
    dishId: venue.food_menu[0]._id.toHexString(),
    soldOutId: venue.food_menu[1]._id.toHexString(),
  };
}

type Venue = Awaited<ReturnType<typeof makeVenue>>;

interface SeedOptions {
  status?: FoodOrderStatus;
  payment?: FoodPaymentStatus;
  razorpayOrderId?: string;
  clientKey?: string;
}

async function seedOrder(venue: Venue, options: SeedOptions = {}) {
  seq += 1;
  return VenueFoodOrderModel.create({
    order_no: `FOOD-B${seq}`,
    venue_id: venue.venueId,
    venue_name: 'Cafe Uno',
    customer_name: 'Asha Rao',
    customer_phone: '9876543210',
    lines: [{ item_id: new Types.ObjectId(venue.dishId), name: 'Paneer Tikka', diet: 'VEG', unit_paise: 24000, quantity: 1, line_paise: 24000 }],
    subtotal_paise: 24000,
    total_paise: 24000,
    status: options.status ?? 'PLACED',
    payment_status: options.payment ?? 'PAID',
    razorpay_integration_id: venue.integrationId,
    razorpay_order_id: options.razorpayOrderId ?? 'order_rzp_seeded',
    client_key: options.clientKey ?? `client-key-${seq}-${crypto.randomUUID()}`,
    access_key: KEY,
  });
}

/** What a refused call was refused with. */
async function refusal(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const refused = error as GraphQLError;
    return { code: refused.extensions?.code, message: refused.message };
  }
  throw new Error('Expected the call to be refused');
}

const placeInput = (venue: Venue, over: Partial<PlaceFoodOrderInput> = {}): PlaceFoodOrderInput => ({
  venue_id: venue.venueId.toHexString(),
  items: [{ item_id: venue.dishId, quantity: 1 }],
  customer_name: 'Asha Rao',
  customer_phone: '9876543210',
  client_key: crypto.randomUUID(),
  ...over,
});

beforeAll(async () => {
  await VenueFoodOrderModel.init();
});

beforeEach(() => {
  rzp.createRazorpayOrder.mockResolvedValue({ id: 'order_rzp_new' } as Awaited<ReturnType<typeof gateway.createRazorpayOrder>>);
  rzp.verifyRazorpaySignature.mockResolvedValue(true);
  send.mockResolvedValue({ status: 'SENT', reason: '', message_id: 'wa-1' });
  urls.mockResolvedValue({ mwebUrl: 'https://app.duncit.test', partnersUrl: 'https://partners.duncit.test' } as Awaited<
    ReturnType<typeof getUrlConfigs>
  >);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('setStatus — the kitchen moves a paid order forward', () => {
  it('moves the order and tells the guest nothing until it is ready', async () => {
    const venue = await makeVenue();
    const order = await seedOrder(venue);

    const moved = await venueFoodOrderService.setStatus(venue.ownerId, false, order.id, 'ACCEPTED');

    expect(moved).toMatchObject({ id: order.id, status: 'ACCEPTED', served_at: null });
    expect((await VenueFoodOrderModel.findById(order._id).lean())?.status).toBe('ACCEPTED');
    expect(send).not.toHaveBeenCalled();
  });

  it('tells the guest when the order is ready', async () => {
    const venue = await makeVenue();
    const order = await seedOrder(venue, { status: 'PREPARING' });
    await venueFoodOrderService.setStatus(venue.ownerId, false, order.id, 'READY');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ event: 'VENUE_FOOD_ORDER_READY', destination: '919876543210' }));
  });

  it('stamps when it was served and asks the guest to rate it — skipping steps is allowed', async () => {
    const venue = await makeVenue();
    const order = await seedOrder(venue);

    const served = await venueFoodOrderService.setStatus(venue.ownerId, false, order.id, 'SERVED');

    expect(served.status).toBe('SERVED');
    expect(served.served_at).toEqual(expect.any(String));
    expect((await VenueFoodOrderModel.findById(order._id).lean())?.served_at).toBeInstanceOf(Date);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'VENUE_FOOD_ORDER_SERVED', buttonUrl: expect.stringContaining('feedback=1') })
    );
  });

  it('refuses a status off the kitchen path', async () => {
    const venue = await makeVenue();
    const order = await seedOrder(venue);
    for (const status of ['CANCELLED', 'EATEN']) {
      expect(await refusal(() => venueFoodOrderService.setStatus(venue.ownerId, false, order.id, status))).toEqual({
        code: 'BAD_USER_INPUT',
        message: 'Choose a valid order status',
      });
    }
    expect((await VenueFoodOrderModel.findById(order._id).lean())?.status).toBe('PLACED');
  });

  it('refuses to move an order that is not paid', async () => {
    const venue = await makeVenue();
    const order = await seedOrder(venue, { payment: 'PENDING' });
    expect(await refusal(() => venueFoodOrderService.setStatus(venue.ownerId, false, order.id, 'ACCEPTED'))).toEqual({
      code: 'BAD_REQUEST',
      message: 'Only a paid order can be moved',
    });
  });

  it('refuses to move an order back, or to where it already is', async () => {
    const venue = await makeVenue();
    const order = await seedOrder(venue, { status: 'READY' });
    for (const status of ['PREPARING', 'READY']) {
      expect(await refusal(() => venueFoodOrderService.setStatus(venue.ownerId, false, order.id, status))).toEqual({
        code: 'BAD_REQUEST',
        message: 'An order can only move forward',
      });
    }
  });

  it('refuses a move read from a status another operator has since changed, and keeps theirs', async () => {
    const venue = await makeVenue();
    const order = await seedOrder(venue);
    const findById = VenueFoodOrderModel.findById.bind(VenueFoodOrderModel);
    jest.spyOn(VenueFoodOrderModel, 'findById').mockImplementationOnce(((id: Types.ObjectId) =>
      findById(id).then(async (stale) => {
        // Between this read and its write, a second tab accepted the order.
        await VenueFoodOrderModel.collection.updateOne({ _id: order._id }, { $set: { status: 'ACCEPTED' } });
        return stale;
      })) as never);

    expect(await refusal(() => venueFoodOrderService.setStatus(venue.ownerId, false, order.id, 'PREPARING'))).toEqual({
      code: 'CONFLICT',
      message: 'This order was just updated — refresh and try again',
    });
    expect((await VenueFoodOrderModel.findById(order._id).lean())?.status).toBe('ACCEPTED');
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses another owner's order and lets a venues-console editor move it", async () => {
    const venue = await makeVenue();
    const order = await seedOrder(venue);
    expect(await refusal(() => venueFoodOrderService.setStatus(new Types.ObjectId().toHexString(), false, order.id, 'ACCEPTED'))).toEqual({
      code: 'FORBIDDEN',
      message: 'Not your venue',
    });
    await expect(venueFoodOrderService.setStatus('editor', true, order.id, 'ACCEPTED')).resolves.toMatchObject({ status: 'ACCEPTED' });
  });

  it('answers an order that does not exist', async () => {
    const venue = await makeVenue();
    expect(await refusal(() => venueFoodOrderService.setStatus(venue.ownerId, false, new Types.ObjectId().toHexString(), 'ACCEPTED'))).toEqual({
      code: 'NOT_FOUND',
      message: 'Order not found',
    });
  });
});

describe('verify — the Razorpay sheet came back', () => {
  const verifyInput = (orderId: string, razorpayOrderId: string) => ({
    order_id: orderId,
    access_key: KEY,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: 'pay_1',
    razorpay_signature: 'signature',
  });

  it("refuses a payment made against another order's Razorpay order, and checks no signature", async () => {
    const venue = await makeVenue();
    const order = await seedOrder(venue, { payment: 'PENDING', razorpayOrderId: 'order_rzp_mine' });
    expect(await refusal(() => venueFoodOrderService.verify(guest, verifyInput(order.id, 'order_rzp_theirs')))).toEqual({
      code: 'BAD_REQUEST',
      message: 'This payment does not belong to this order',
    });
    expect(rzp.verifyRazorpaySignature).not.toHaveBeenCalled();
    expect((await VenueFoodOrderModel.findById(order._id).lean())?.payment_status).toBe('PENDING');
  });

  it('refuses a signature the venue secret does not match, leaving the order unpaid', async () => {
    const venue = await makeVenue();
    const order = await seedOrder(venue, { payment: 'PENDING', razorpayOrderId: 'order_rzp_mine' });
    rzp.verifyRazorpaySignature.mockResolvedValue(false);
    expect(await refusal(() => venueFoodOrderService.verify(guest, verifyInput(order.id, 'order_rzp_mine')))).toEqual({
      code: 'BAD_REQUEST',
      message: 'Payment verification failed',
    });
    expect(rzp.verifyRazorpaySignature).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order_rzp_mine', account: { keyId: 'rzp_test_venue', keySecret: 'venue-secret' } })
    );
    expect((await VenueFoodOrderModel.findById(order._id).lean())?.payment_status).toBe('PENDING');
  });

  it('answers an order already paid as it is, without checking again', async () => {
    const venue = await makeVenue();
    const order = await seedOrder(venue, { razorpayOrderId: 'order_rzp_mine' });
    await expect(venueFoodOrderService.verify(guest, verifyInput(order.id, 'order_rzp_mine'))).resolves.toMatchObject({
      payment_status: 'PAID',
    });
    expect(rzp.verifyRazorpaySignature).not.toHaveBeenCalled();
  });

  it('refuses an order that does not exist', async () => {
    expect(await refusal(() => venueFoodOrderService.verify(guest, verifyInput(new Types.ObjectId().toHexString(), 'x')))).toEqual({
      code: 'NOT_FOUND',
      message: 'Order not found',
    });
  });
});

describe('read — the guest order page', () => {
  it('answers nothing for an id that is not one, or an order that does not exist', async () => {
    await expect(venueFoodOrderService.read(guest, 'nope', KEY)).resolves.toBeNull();
    await expect(venueFoodOrderService.read(guest, new Types.ObjectId().toHexString(), KEY)).resolves.toBeNull();
  });
});

describe('place — what a checkout refuses', () => {
  it('asks a repeated attempt to wait while its Razorpay order is still being opened', async () => {
    const venue = await makeVenue();
    const clientKey = crypto.randomUUID();
    await seedOrder(venue, { payment: 'PENDING', razorpayOrderId: '', clientKey });

    expect(await refusal(() => venueFoodOrderService.place(guest, placeInput(venue, { client_key: clientKey })))).toEqual({
      code: 'CONFLICT',
      message: 'Your order is still being set up — try again in a moment',
    });
    expect(await VenueFoodOrderModel.countDocuments()).toBe(1);
    expect(rzp.createRazorpayOrder).not.toHaveBeenCalled();
  });

  it('answers a repeated attempt of a paid order without a payment sheet', async () => {
    const venue = await makeVenue();
    const clientKey = crypto.randomUUID();
    const order = await seedOrder(venue, { clientKey });
    const placed = await venueFoodOrderService.place(guest, placeInput(venue, { client_key: clientKey }));
    expect(placed).toMatchObject({ order: { id: order.id, payment_status: 'PAID' }, access_key: KEY, razorpay: null });
  });

  it('refuses an expired session key before reading anything', async () => {
    const venue = await makeVenue();
    expect(await refusal(() => venueFoodOrderService.place(guest, placeInput(venue, { client_key: 'short' })))).toEqual({
      code: 'BAD_USER_INPUT',
      message: 'Your order session has expired — refresh the page',
    });
  });

  it('answers a venue that is not live as not found, and one not taking orders as closed', async () => {
    const draft = await makeVenue({ status: 'DRAFT' });
    const paused = await makeVenue({ is_active: false });
    const closed = await makeVenue({ offers_food: false });
    expect((await refusal(() => venueFoodOrderService.place(guest, placeInput(draft)))).code).toBe('NOT_FOUND');
    expect((await refusal(() => venueFoodOrderService.place(guest, placeInput(paused)))).code).toBe('NOT_FOUND');
    expect((await refusal(() => venueFoodOrderService.place(guest, placeInput(closed)))).code).toBe('FOOD_ORDERING_CLOSED');
    expect(await VenueFoodOrderModel.countDocuments()).toBe(0);
  });

  it("refuses a guest's details that do not hold", async () => {
    const venue = await makeVenue();
    const cases: Array<[Partial<PlaceFoodOrderInput>, string]> = [
      [{ customer_name: 'A' }, 'Enter your name'],
      [{ customer_phone: '98765' }, 'Enter a valid 10-digit mobile number'],
      [{ table_label: 'T'.repeat(21) }, 'Keep the table or seat under 20 characters'],
      [{ note: 'n'.repeat(301) }, 'Keep the note under 300 characters'],
    ];
    for (const [over, message] of cases) {
      expect(await refusal(() => venueFoodOrderService.place(guest, placeInput(venue, over)))).toEqual({ code: 'BAD_USER_INPUT', message });
    }
    expect(await VenueFoodOrderModel.countDocuments()).toBe(0);
  });

  it('refuses an empty cart, a bad quantity, too many dishes and too many of one', async () => {
    const venue = await makeVenue();
    const tooManyLines = Array.from({ length: 31 }, () => ({ item_id: new Types.ObjectId().toHexString(), quantity: 1 }));
    const cases: Array<[PlaceFoodOrderInput['items'], string]> = [
      [[], 'Your cart is empty'],
      [[{ item_id: venue.dishId, quantity: 0 }], 'Choose a valid quantity'],
      [[{ item_id: venue.dishId, quantity: 1.5 }], 'Choose a valid quantity'],
      [tooManyLines, 'One order can hold at most 30 different items'],
      // Two cart rows of the same dish are one line: 15 + 6 is over the cap of 20.
      [
        [
          { item_id: venue.dishId, quantity: 15 },
          { item_id: venue.dishId, quantity: 6 },
        ],
        'You can order at most 20 of Paneer Tikka',
      ],
    ];
    for (const [items, message] of cases) {
      expect(await refusal(() => venueFoodOrderService.place(guest, placeInput(venue, { items })))).toEqual({ code: 'BAD_USER_INPUT', message });
    }
  });

  it('refuses a dish no longer on the menu, and one sold out', async () => {
    const venue = await makeVenue();
    expect(
      await refusal(() => venueFoodOrderService.place(guest, placeInput(venue, { items: [{ item_id: new Types.ObjectId().toHexString(), quantity: 1 }] })))
    ).toEqual({ code: 'FOOD_ITEM_UNAVAILABLE', message: 'An item in your cart is no longer on the menu' });
    expect(await refusal(() => venueFoodOrderService.place(guest, placeInput(venue, { items: [{ item_id: venue.soldOutId, quantity: 1 }] })))).toEqual({
      code: 'FOOD_ITEM_UNAVAILABLE',
      message: 'Masala Chai is not available right now',
    });
  });
});
