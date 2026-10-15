/**
 * What a guest does with a paid order, against the in-memory database: its
 * invoice, a one-shot upload pass for a feedback photo, and rating it once it
 * is served. ImageKit, WhatsApp and the URL settings are the only seams
 * replaced — the access rule, the guards and the writes are the real ones.
 */
jest.mock('@modules/platform/upload/upload.service', () => ({
  ...jest.requireActual('@modules/platform/upload/upload.service'),
  getImagekitConfig: jest.fn(),
  getImagekitAuth: jest.fn(),
}));
jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({
  whatsappService: { send: jest.fn() },
}));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));

import type { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { getUrlConfigs } from '@config/url-configs';
import { makeContext } from '@test/harness';
import { capturePdfText } from '@test/pdf-text';
import { UserModel } from '@modules/access/user/user.model';
import { getImagekitAuth, getImagekitConfig } from '@modules/platform/upload/upload.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueFoodOrderModel, type FoodOrderStatus, type FoodPaymentStatus } from '../../venueFoodOrder.model';
import { venueFoodGuestService, type FoodFeedbackInput } from '../../venueFoodOrder.guest';

const imagekitConfig = jest.mocked(getImagekitConfig);
const imagekitAuth = jest.mocked(getImagekitAuth);
const send = jest.mocked(whatsappService.send);
const urls = jest.mocked(getUrlConfigs);

const MEDIA = 'https://ik.imagekit.io/duncit';
const PHOTO = `${MEDIA}/prod/venues/food_feedback/plate.jpg`;
const KEY = 'guest-access-key-123';
const guest = makeContext(null);

let seq = 0;

async function makeVenue(owner?: Types.ObjectId) {
  const venue = await VenueModel.create({
    owner_user_id: owner ?? new Types.ObjectId(),
    owner_name: 'Meera',
    venue_name: 'Cafe Uno',
    status: 'APPROVED',
  });
  return venue._id;
}

interface SeedOptions {
  venue?: Types.ObjectId;
  user?: Types.ObjectId | null;
  status?: FoodOrderStatus;
  payment?: FoodPaymentStatus;
  rated?: boolean;
}

async function seedOrder(options: SeedOptions = {}) {
  seq += 1;
  const order = await VenueFoodOrderModel.create({
    order_no: `FOOD-G${seq}`,
    venue_id: options.venue ?? (await makeVenue()),
    venue_name: 'Cafe Uno',
    user_id: options.user ?? null,
    customer_name: 'Asha Rao',
    customer_phone: '9876543210',
    lines: [{ item_id: new Types.ObjectId(), name: 'Paneer Tikka', diet: 'VEG', unit_paise: 24000, quantity: 1, line_paise: 24000 }],
    subtotal_paise: 24000,
    total_paise: 24000,
    status: options.status ?? 'SERVED',
    payment_status: options.payment ?? 'PAID',
    razorpay_integration_id: new Types.ObjectId(),
    razorpay_payment_id: 'pay_guest_1',
    paid_at: new Date(),
    client_key: `client-key-${seq}`,
    access_key: KEY,
    ...(options.rated ? { feedback: { rating: 5, comment: '', images: [], submitted_at: new Date() } } : {}),
  });
  return order;
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

const rate = (orderId: string, over: Partial<FoodFeedbackInput> = {}) =>
  venueFoodGuestService.submitFeedback(guest, { order_id: orderId, access_key: KEY, rating: 4, ...over });

beforeEach(() => {
  imagekitConfig.mockResolvedValue({ urlEndpoint: MEDIA } as unknown as Awaited<ReturnType<typeof getImagekitConfig>>);
  imagekitAuth.mockResolvedValue({ token: 't', expire: 1, signature: 's' } as unknown as Awaited<ReturnType<typeof getImagekitAuth>>);
  send.mockResolvedValue({ status: 'SENT', reason: '', message_id: 'wa-1' });
  urls.mockResolvedValue({ mwebUrl: 'https://app.duncit.test', partnersUrl: 'https://partners.duncit.test/' } as Awaited<
    ReturnType<typeof getUrlConfigs>
  >);
});

describe('who may touch an order', () => {
  it('refuses a wrong key, a missing order and an id that is not one', async () => {
    const order = await seedOrder();
    expect(await refusal(() => venueFoodGuestService.feedbackUploadPass(guest, order.id, 'not-the-key'))).toEqual({
      code: 'FORBIDDEN',
      message: 'This order link is not valid',
    });
    expect(await refusal(() => venueFoodGuestService.feedbackUploadPass(guest, new Types.ObjectId().toHexString(), KEY))).toEqual({
      code: 'NOT_FOUND',
      message: 'Order not found',
    });
    expect(await refusal(() => venueFoodGuestService.invoicePdfBase64(guest, 'nope', KEY))).toEqual({
      code: 'BAD_USER_INPUT',
      message: 'Invalid order id',
    });
    expect(imagekitAuth).not.toHaveBeenCalled();
  });
});

describe('the invoice', () => {
  it('is refused until the order is paid, and counts nothing', async () => {
    const order = await seedOrder({ status: 'PLACED', payment: 'PENDING' });
    expect(await refusal(() => venueFoodGuestService.invoicePdfBase64(guest, order.id, KEY))).toEqual({
      code: 'BAD_REQUEST',
      message: 'An invoice is ready once the order is paid',
    });
    expect((await VenueFoodOrderModel.findById(order._id).lean())?.invoice_downloads).toBe(0);
  });

  it('prints the refund under a cancelled order and counts each download', async () => {
    const refunded = await seedOrder({ status: 'CANCELLED', payment: 'REFUNDED' });
    const pending = await seedOrder({ status: 'CANCELLED', payment: 'REFUND_PENDING' });

    const refundedText = (await capturePdfText(() => venueFoodGuestService.invoicePdfBase64(guest, refunded.id, KEY))).map((d) => d.text);
    const pendingText = (await capturePdfText(() => venueFoodGuestService.invoicePdfBase64(guest, pending.id, KEY))).map((d) => d.text);

    expect(refundedText).toContain('This order was cancelled and refunded in full.');
    expect(pendingText).toContain('This order was cancelled. A full refund is on its way.');
    expect(pendingText).not.toContain('This order was cancelled and refunded in full.');
    const stored = await VenueFoodOrderModel.findById(refunded._id).lean();
    expect(stored?.invoice_downloads).toBe(1);
    expect(stored?.invoice_downloaded_at).toBeInstanceOf(Date);
  });

  it('prints no refund line on an order that was simply paid', async () => {
    const order = await seedOrder();
    const drawn = (await capturePdfText(() => venueFoodGuestService.invoicePdfBase64(guest, order.id, KEY))).map((d) => d.text);
    expect(drawn.some((line) => line.startsWith('This order was cancelled'))).toBe(false);
    expect(drawn).toContain('Paid online · Payment reference: pay_guest_1');
  });
});

describe('feedbackUploadPass', () => {
  it('issues a pass filed under the venue, attributed to the guest when there is no account', async () => {
    const order = await seedOrder();
    const pass = await venueFoodGuestService.feedbackUploadPass(guest, order.id, KEY);
    expect(pass).toEqual({ token: 't', expire: 1, signature: 's' });
    expect(imagekitAuth).toHaveBeenCalledWith(
      'venue-food-guest',
      expect.stringContaining(`/venues/${order.venue_id.toHexString()}/food_feedback`),
      'mweb'
    );
  });

  it("attributes the pass to the account that placed the order, which needs no key", async () => {
    const member = new Types.ObjectId();
    const order = await seedOrder({ user: member });
    await venueFoodGuestService.feedbackUploadPass(makeContext({ id: member.toHexString() }), order.id);
    expect(imagekitAuth).toHaveBeenCalledWith(member.toHexString(), expect.any(String), 'mweb');
  });

  it('is refused before the order is served, and once it has been rated', async () => {
    const cooking = await seedOrder({ status: 'PREPARING' });
    const rated = await seedOrder({ rated: true });
    expect(await refusal(() => venueFoodGuestService.feedbackUploadPass(guest, cooking.id, KEY))).toEqual({
      code: 'BAD_REQUEST',
      message: 'You can rate an order once it has been served',
    });
    expect(await refusal(() => venueFoodGuestService.feedbackUploadPass(guest, rated.id, KEY))).toEqual({
      code: 'CONFLICT',
      message: 'This order has already been rated',
    });
    expect(imagekitAuth).not.toHaveBeenCalled();
  });
});

describe('submitFeedback', () => {
  it('saves the rating once, trimmed, with photos from the media host, and tells the owner the stars', async () => {
    const owner = await UserModel.create({ auth: { email: 'meera@cafe.test' }, profile: { first_name: 'Meera' } });
    const order = await seedOrder({ venue: await makeVenue(owner._id) });

    const result = await rate(order.id, { rating: 4, comment: '  Lovely paneer  ', images: [` ${PHOTO} `] });

    expect(result.feedback).toMatchObject({ rating: 4, comment: 'Lovely paneer', images: [PHOTO] });
    const stored = await VenueFoodOrderModel.findById(order._id).lean();
    expect(stored?.feedback).toMatchObject({ rating: 4, comment: 'Lovely paneer', images: [PHOTO] });
    expect(stored?.feedback?.submitted_at).toBeInstanceOf(Date);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'VENUE_FOOD_FEEDBACK_RECEIVED',
        name: 'Meera',
        params: ['Meera', order.order_no, 'Cafe Uno', '4/5', 'https://partners.duncit.test/venues/food-orders'],
      })
    );
  });

  it('accepts a rating without a comment or photos, and never asks ImageKit', async () => {
    const order = await seedOrder();
    const result = await rate(order.id, { rating: 1, comment: null, images: null });
    expect(result.feedback).toMatchObject({ rating: 1, comment: '', images: [] });
    expect(imagekitConfig).not.toHaveBeenCalled();
  });

  it('refuses a rating outside 1 to 5 or not whole, and saves nothing', async () => {
    const order = await seedOrder();
    for (const rating of [0, 6, 3.5, Number.NaN]) {
      expect(await refusal(() => rate(order.id, { rating }))).toEqual({ code: 'BAD_USER_INPUT', message: 'Choose a rating from 1 to 5' });
    }
    expect((await VenueFoodOrderModel.findById(order._id).lean())?.feedback).toBeUndefined();
  });

  it('holds the comment to 500 characters and the photos to 3', async () => {
    const order = await seedOrder();
    expect(await refusal(() => rate(order.id, { comment: 'x'.repeat(501) }))).toEqual({
      code: 'BAD_USER_INPUT',
      message: 'Keep your feedback under 500 characters',
    });
    expect(await refusal(() => rate(order.id, { images: [PHOTO, PHOTO, PHOTO, PHOTO] }))).toEqual({
      code: 'BAD_USER_INPUT',
      message: 'You can add at most 3 photos',
    });
    await expect(rate(order.id, { comment: 'x'.repeat(500), images: [PHOTO, PHOTO, PHOTO] })).resolves.toMatchObject({
      feedback: { rating: 4 },
    });
  });

  it('refuses a photo that is not https on the media host', async () => {
    const order = await seedOrder();
    const badPhoto = { code: 'BAD_USER_INPUT', message: 'A photo could not be read — remove it and add it again' };
    for (const image of ['https://evil.example/plate.jpg', 'http://ik.imagekit.io/duncit/plate.jpg', 'not a url']) {
      expect(await refusal(() => rate(order.id, { images: [image] }))).toEqual(badPhoto);
    }
    expect((await VenueFoodOrderModel.findById(order._id).lean())?.feedback).toBeUndefined();
  });

  it('refuses every photo while the media host is not configured', async () => {
    const order = await seedOrder();
    imagekitConfig.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof getImagekitConfig>>);
    expect((await refusal(() => rate(order.id, { images: [PHOTO] }))).code).toBe('BAD_USER_INPUT');
  });

  it('is refused before the order is served', async () => {
    const order = await seedOrder({ status: 'READY' });
    expect(await refusal(() => rate(order.id))).toEqual({ code: 'BAD_REQUEST', message: 'You can rate an order once it has been served' });
  });

  it('saves exactly one rating when two land together, and refuses any later one', async () => {
    const order = await seedOrder();
    const settled = await Promise.allSettled([rate(order.id, { rating: 5 }), rate(order.id, { rating: 2 })]);

    expect(settled.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const refused = settled.find((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected');
    expect((refused?.reason as GraphQLError).extensions?.code).toBe('CONFLICT');
    expect(await refusal(() => rate(order.id, { rating: 3 }))).toEqual({ code: 'CONFLICT', message: 'This order has already been rated' });
    const stored = await VenueFoodOrderModel.findById(order._id).lean();
    const winner = settled.find((outcome) => outcome.status === 'fulfilled');
    expect(winner?.status === 'fulfilled' && winner.value.feedback?.rating).toBe(stored?.feedback?.rating);
  });
});
