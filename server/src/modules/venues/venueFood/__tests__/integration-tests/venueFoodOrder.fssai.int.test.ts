import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import * as gateway from '@modules/finance/payment/razorpay.gateway';
import { PartnerIntegrationModel } from '@modules/venues/ecommBrand/partnerIntegration.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueFoodOrderModel } from '../../venueFoodOrder.model';
import { venueFoodGuestService } from '../../venueFoodOrder.guest';
import { markFoodOrderPaid } from '../../venueFoodOrder.payment';
import { venueFoodOrderService } from '../../venueFoodOrder.service';

/**
 * The venue's FSSAI licence number is copied onto a food order when it is
 * placed and printed on that order's invoice — so a later edit of the licence
 * never rewrites a bill already issued. Razorpay is the only thing replaced.
 */
jest.mock('@modules/finance/payment/razorpay.gateway');
const rzp = jest.mocked(gateway);

const FSSAI = '12345678901234';
/** pdfkit's typings describe the instance only; the drawing methods live on the class prototype. */
const pdfPrototype = (PDFDocument as unknown as { prototype: PDFKit.PDFDocument }).prototype;

async function makeVenue(fssai?: string) {
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
    food_menu: [{ name: 'Paneer Tikka', price: 240, diet: 'VEG' }],
    food_ordering: { enabled: true, razorpay_integration_id: account._id },
    ...(fssai === undefined ? {} : { food_licences: { fssai_number: fssai } }),
  });
  return { venueId: venue._id.toHexString(), dishId: venue.food_menu[0]._id.toHexString() };
}

const member = makeContext({ id: new Types.ObjectId().toHexString() });

async function placeAndPay(venue: Awaited<ReturnType<typeof makeVenue>>) {
  const { order } = await venueFoodOrderService.place(member, {
    venue_id: venue.venueId,
    items: [{ item_id: venue.dishId, quantity: 1 }],
    customer_name: 'Asha Rao',
    customer_phone: '9876543210',
    client_key: crypto.randomUUID(),
  });
  await markFoodOrderPaid(new Types.ObjectId(order.id), `pay_${order.id}`);
  return order.id;
}

/** Every string the invoice drew. */
async function invoiceText(orderId: string) {
  const text = jest.spyOn(pdfPrototype, 'text');
  const pdf = await venueFoodGuestService.invoicePdfBase64(member, orderId);
  const drawn = text.mock.calls.map(([value]) => String(value));
  text.mockRestore();
  expect(Buffer.from(pdf, 'base64').subarray(0, 5).toString()).toBe('%PDF-');
  return drawn;
}

beforeAll(async () => {
  await VenueFoodOrderModel.init();
});

beforeEach(() => {
  rzp.createRazorpayOrder.mockResolvedValue({ id: 'order_rzp_1' } as Awaited<ReturnType<typeof gateway.createRazorpayOrder>>);
});

describe("the venue's FSSAI number on a food order", () => {
  it('snapshots the number at place time and prints it on the invoice, even after the venue changes it', async () => {
    const venue = await makeVenue(FSSAI);
    const orderId = await placeAndPay(venue);
    expect((await VenueFoodOrderModel.findById(orderId).lean())?.venue_fssai).toBe(FSSAI);

    await VenueModel.updateOne({ _id: venue.venueId }, { $set: { 'food_licences.fssai_number': '99999999999999' } });

    const drawn = await invoiceText(orderId);
    expect(drawn).toContain(`FSSAI Lic. No: ${FSSAI}`);
    expect(drawn.some((line) => line.includes('99999999999999'))).toBe(false);
  });

  it('stores a blank for a venue without a licence, and prints no FSSAI line', async () => {
    const venue = await makeVenue();
    const orderId = await placeAndPay(venue);
    expect((await VenueFoodOrderModel.findById(orderId).lean())?.venue_fssai).toBe('');
    expect((await invoiceText(orderId)).some((line) => line.startsWith('FSSAI'))).toBe(false);
  });

  it('prints no FSSAI line for an order placed before the field existed', async () => {
    const venue = await makeVenue(FSSAI);
    const orderId = await placeAndPay(venue);
    await VenueFoodOrderModel.collection.updateOne({ _id: new Types.ObjectId(orderId) }, { $unset: { venue_fssai: '' } });
    expect((await invoiceText(orderId)).some((line) => line.startsWith('FSSAI'))).toBe(false);
  });
});
