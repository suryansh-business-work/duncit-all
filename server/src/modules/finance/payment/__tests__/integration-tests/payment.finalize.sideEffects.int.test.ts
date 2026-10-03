// Phase 2 of finalization against a real payments collection. Every third party
// the deferred steps reach (SMTP, the PDF builder, ShipRocket, WhatsApp, the
// marketing attribution and the ticket mailer) is stubbed; the step ledger,
// the lease and the COMPLETE gate are what is under test.
jest.mock('@services/invoice/invoice.pdf', () => ({ generateInvoicePdf: jest.fn() }));
jest.mock('../../payment.invoice', () => ({ invoiceDataForPayment: jest.fn().mockResolvedValue({}) }));
jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn() }));
jest.mock('@modules/pods/ticket/ticket.service', () => ({
  ticketService: { emailById: jest.fn(), ensureForMembership: jest.fn() },
}));
jest.mock('@modules/pods/podMember/podMember.service', () => ({
  fillBackoutsAfterJoin: jest.fn(),
  podMemberService: { createPaidMembership: jest.fn() },
}));
jest.mock('@modules/crm/marketing/shortLinkJourney.service', () => ({
  shortLinkJourneyService: { attributePayment: jest.fn() },
}));
jest.mock('@modules/commerce/productOrder/productOrder.service', () => ({
  productOrderService: { tryCreateShipment: jest.fn(), createFromPayment: jest.fn() },
}));
jest.mock('@modules/finance/giftcard/giftcard.service', () => ({
  giftcardService: { emailForPayment: jest.fn(), issueForPayment: jest.fn() },
}));
jest.mock('@modules/commerce/store/store.whatsapp', () => ({ whatsappStoreOrdersPlaced: jest.fn() }));
jest.mock('@modules/pods/pod/pod.place', () => ({ podPlaceLine: jest.fn().mockResolvedValue('Hall A, Pune') }));
jest.mock('@services/notify/notify.service', () => ({ notifyEvent: jest.fn() }));

import { Types } from 'mongoose';
import { generateInvoicePdf } from '@services/invoice/invoice.pdf';
import { sendEmail } from '@services/email/email.service';
import { ticketService } from '@modules/pods/ticket/ticket.service';
import { fillBackoutsAfterJoin } from '@modules/pods/podMember/podMember.service';
import { shortLinkJourneyService } from '@modules/crm/marketing/shortLinkJourney.service';
import { productOrderService } from '@modules/commerce/productOrder/productOrder.service';
import { giftcardService } from '@modules/finance/giftcard/giftcard.service';
import { whatsappStoreOrdersPlaced } from '@modules/commerce/store/store.whatsapp';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { getUrlConfigs } from '@config/url-configs';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { PaymentModel, type IPaymentStep, type PaymentStepKey } from '../../payment.model';
import { COD_GATEWAY, paymentFinalizer } from '../../payment.finalize';

const mockPdf = jest.mocked(generateInvoicePdf);
const mockMail = sendEmail as jest.Mock;
const mockTicketMail = ticketService.emailById as jest.Mock;
const mockShip = productOrderService.tryCreateShipment as jest.Mock;
const mockGiftMail = giftcardService.emailForPayment as jest.Mock;
const mockStoreWa = whatsappStoreOrdersPlaced as jest.Mock;

const DEFERRED: PaymentStepKey[] = [
  'BACKOUT_FILL',
  'LINK_ATTRIBUTION',
  'TICKET_EMAIL',
  'INVOICE_PDF',
  'RECEIPT_EMAIL',
  'GIFT_CARD_EMAIL',
  'SHIPMENT',
];
const PDF = Buffer.from('pdfbytes'); // 8 bytes

let seq = 0;
const step = (key: PaymentStepKey, status: IPaymentStep['status'], refs: string[] = [], detail = '') => ({
  key,
  status,
  detail,
  refs,
  at: new Date(),
});

/** A payment whose booking core has committed: deferred steps all PENDING. */
async function seedCoreDone(over: Record<string, unknown> = {}, coreSteps: ReturnType<typeof step>[] = []) {
  seq += 1;
  return PaymentModel.create({
    payment_id: `PAY-SE-${seq}`,
    invoice_no: `INV/${seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Asha',
    user_email: `asha${seq}@x.com`,
    subtotal: 500,
    total: 500,
    target_type: 'OTHER',
    description: 'Membership top-up',
    status: 'SUCCESS',
    gateway: 'RAZORPAY',
    finalize_state: 'CORE_DONE',
    steps: [step('PAYMENT_CAPTURED', 'DONE', [], 'Razorpay'), ...coreSteps, ...DEFERRED.map((k) => step(k, 'PENDING'))],
    ...over,
  });
}

const stepsOf = async (id: unknown) => {
  const row = await PaymentModel.findById(id).lean();
  return Object.fromEntries((row?.steps ?? []).map((s) => [s.key, s]));
};

const seedPod = () =>
  PodModel.create({
    pod_id: `se-pod-${++seq}`,
    pod_title: 'Sunrise Trek',
    pod_hosts_id: [new Types.ObjectId()],
    club_id: new Types.ObjectId(),
    pod_description: 'Trek',
    pod_date_time: new Date('2026-12-01T01:30:00Z'),
    pod_type: 'PAID',
    pod_amount: 500,
  });

const seedOrder = (paymentId: unknown, over: Record<string, unknown> = {}) =>
  ProductOrderModel.create({
    order_no: `ORD-${++seq}`,
    payment_id: paymentId,
    items_total: 300,
    total: 300,
    fulfilment_method: 'SHIP',
    pickup_location_id: `wh-${seq}`,
    line_items: [{ product_id: new Types.ObjectId(), name: 'Leash', qty: 2, unit_cost: 150, gross: 300 }],
    ...over,
  });

beforeEach(() => {
  mockPdf.mockResolvedValue(PDF);
  mockMail.mockResolvedValue(undefined);
  mockShip.mockReset();
});

describe('runSideEffects — a pod booking', () => {
  it('runs every deferred step once, mails the pod receipt with the invoice attached, and completes', async () => {
    const pod = await seedPod();
    const membershipId = new Types.ObjectId().toHexString();
    const ticketId = new Types.ObjectId().toHexString();
    const p = await seedCoreDone({ target_type: 'POD', pod_id: pod._id, invoice_no: 'DUN/2627/000042' }, [
      step('MEMBERSHIP', 'DONE', [membershipId]),
      step('TICKET', 'DONE', [ticketId]),
    ]);

    await paymentFinalizer.runSideEffects(String(p._id));

    const s = await stepsOf(p._id);
    expect(s.BACKOUT_FILL.status).toBe('DONE');
    expect(s.LINK_ATTRIBUTION.status).toBe('DONE');
    expect(s.TICKET_EMAIL).toMatchObject({ status: 'DONE', detail: p.user_email, refs: [ticketId] });
    expect(s.GIFT_CARD_EMAIL).toMatchObject({ status: 'SKIPPED', detail: 'This payment bought no gift card' });
    expect(s.SHIPMENT).toMatchObject({ status: 'SKIPPED', detail: 'Nothing on this payment ships' });
    expect(s.INVOICE_PDF).toMatchObject({ status: 'DONE', detail: '8 bytes' });
    expect(s.RECEIPT_EMAIL).toMatchObject({ status: 'DONE', detail: p.user_email });

    expect(fillBackoutsAfterJoin).toHaveBeenCalledWith(expect.objectContaining({ _id: pod._id }), String(p.user_id));
    expect(shortLinkJourneyService.attributePayment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: String(p.user_id), paymentId: String(p._id), amount: 500 })
    );
    expect(mockTicketMail).toHaveBeenCalledWith(ticketId);

    const { appUrl } = await getUrlConfigs();
    const { currency_symbol } = await getFinanceSettings();
    expect(mockMail).toHaveBeenCalledTimes(1);
    const mail = mockMail.mock.calls[0][0];
    expect(mail).toMatchObject({
      to: p.user_email,
      template: 'payment-receipt-pod',
      subject: 'Pod booking receipt — DUN/2627/000042',
      category: 'billing',
    });
    expect(mail.vars).toMatchObject({
      name: 'Asha',
      invoice_no: 'DUN/2627/000042',
      payment_id: p.payment_id,
      amount: `${currency_symbol}500.00`,
      pod_title: 'Sunrise Trek',
      venue_line: 'Hall A, Pune',
      booking_url: `${appUrl.replace(/\/+$/, '')}/booking/${membershipId}`,
    });
    expect(mail.attachments).toEqual([
      { filename: 'invoice-DUN-2627-000042.pdf', content: PDF, contentType: 'application/pdf' },
    ]);

    const row = await PaymentModel.findById(p._id).lean();
    expect(row).toMatchObject({ finalize_state: 'COMPLETE', side_effects_lease_at: null });
    expect(row?.finalized_at).toBeInstanceOf(Date);
  });

  it('is idempotent: a second run over a COMPLETE payment touches nothing', async () => {
    const p = await seedCoreDone();
    await paymentFinalizer.runSideEffects(String(p._id));
    mockMail.mockClear();
    mockPdf.mockClear();

    await paymentFinalizer.runSideEffects(String(p._id));

    expect(mockMail).not.toHaveBeenCalled();
    expect(mockPdf).not.toHaveBeenCalled();
  });

  it('a pod deleted since checkout still gets a receipt, from the payment description', async () => {
    const p = await seedCoreDone({ target_type: 'POD', pod_id: new Types.ObjectId(), description: 'Trek on 1 Dec' });
    await paymentFinalizer.runSideEffects(String(p._id));

    const s = await stepsOf(p._id);
    expect(s.BACKOUT_FILL).toMatchObject({ status: 'SKIPPED', detail: 'The pod no longer exists' });
    expect(s.TICKET_EMAIL).toMatchObject({ status: 'SKIPPED', detail: 'This payment has no pod' });
    expect(mockMail.mock.calls[0][0].vars).toMatchObject({
      pod_title: 'Trek on 1 Dec',
      date_label: 'Trek on 1 Dec',
      venue_line: '—',
    });
  });
});

describe('runSideEffects — the lease', () => {
  it('a payment another runner holds a fresh lease on is left alone', async () => {
    const p = await seedCoreDone({ side_effects_lease_at: new Date(Date.now() - 60_000) });
    await paymentFinalizer.runSideEffects(String(p._id));
    expect(mockMail).not.toHaveBeenCalled();
    expect((await PaymentModel.findById(p._id).lean())?.finalize_state).toBe('CORE_DONE');
  });

  it('a lease older than five minutes is taken over', async () => {
    const p = await seedCoreDone({ side_effects_lease_at: new Date(Date.now() - 6 * 60_000) });
    await paymentFinalizer.runSideEffects(String(p._id));
    expect((await PaymentModel.findById(p._id).lean())?.finalize_state).toBe('COMPLETE');
  });

  it('never runs phase 2 for a payment whose core did not commit', async () => {
    for (const finalize_state of ['NOT_STARTED', 'FAILED']) {
      const p = await seedCoreDone({ finalize_state });
      await paymentFinalizer.runSideEffects(String(p._id));
    }
    expect(mockMail).not.toHaveBeenCalled();
    expect(mockPdf).not.toHaveBeenCalled();
  });
});

describe('runSideEffects — failures', () => {
  it('a failed step is recorded FAILED, the payment stays CORE_DONE with its lease released, and a re-run redoes only that step', async () => {
    const ticketId = new Types.ObjectId().toHexString();
    const p = await seedCoreDone({ target_type: 'POD' }, [step('TICKET', 'DONE', [ticketId])]);
    mockTicketMail.mockRejectedValueOnce(new Error('SMTP 421'));

    await paymentFinalizer.runSideEffects(String(p._id));

    let s = await stepsOf(p._id);
    expect(s.TICKET_EMAIL).toMatchObject({ status: 'FAILED', detail: 'SMTP 421' });
    expect(s.RECEIPT_EMAIL.status).toBe('DONE');
    let row = await PaymentModel.findById(p._id).lean();
    expect(row).toMatchObject({ finalize_state: 'CORE_DONE', side_effects_lease_at: null, finalized_at: null });

    mockMail.mockClear();
    await paymentFinalizer.runSideEffects(String(p._id));

    s = await stepsOf(p._id);
    expect(s.TICKET_EMAIL.status).toBe('DONE');
    expect(mockTicketMail).toHaveBeenCalledTimes(2);
    // The receipt already went: the retry must not mail it again.
    expect(mockMail).not.toHaveBeenCalled();
    row = await PaymentModel.findById(p._id).lean();
    expect(row?.finalize_state).toBe('COMPLETE');
  });

  it('a PDF that cannot be built fails both the PDF and the receipt, and no mail goes out', async () => {
    const p = await seedCoreDone();
    mockPdf.mockRejectedValueOnce('renderer crashed');

    await paymentFinalizer.runSideEffects(String(p._id));

    const s = await stepsOf(p._id);
    expect(s.INVOICE_PDF).toMatchObject({ status: 'FAILED', detail: 'renderer crashed' });
    expect(s.RECEIPT_EMAIL).toMatchObject({ status: 'FAILED', detail: 'The invoice it attaches was not generated' });
    expect(mockMail).not.toHaveBeenCalled();
    expect((await PaymentModel.findById(p._id).lean())?.finalize_state).toBe('CORE_DONE');
  });

  it('a receipt SMTP failure keeps the PDF step DONE and records the mail error', async () => {
    const p = await seedCoreDone();
    mockMail.mockRejectedValueOnce(new Error('mailbox full'));

    await paymentFinalizer.runSideEffects(String(p._id));

    const s = await stepsOf(p._id);
    expect(s.INVOICE_PDF.status).toBe('DONE');
    expect(s.RECEIPT_EMAIL).toMatchObject({ status: 'FAILED', detail: 'mailbox full' });
  });

  it('`only` narrows the run to the named steps and the payment stays CORE_DONE while others are owed', async () => {
    const p = await seedCoreDone();
    await paymentFinalizer.runSideEffects(String(p._id), ['SHIPMENT']);

    const s = await stepsOf(p._id);
    expect(s.SHIPMENT.status).toBe('SKIPPED');
    expect(s.RECEIPT_EMAIL.status).toBe('PENDING');
    expect(s.BACKOUT_FILL.status).toBe('PENDING');
    expect(mockMail).not.toHaveBeenCalled();
    expect((await PaymentModel.findById(p._id).lean())?.finalize_state).toBe('CORE_DONE');
  });
});

describe('runSideEffects — shop orders', () => {
  it('books each unbooked SHIP order once and never re-books one ShipRocket already holds', async () => {
    const p = await seedCoreDone({ target_type: 'PRODUCT' });
    const fresh = await seedOrder(p._id);
    await seedOrder(p._id, { shiprocket: { order_id: 'SR-1' } });
    await seedOrder(p._id, { fulfilment_method: 'PICKUP' });

    await paymentFinalizer.runSideEffects(String(p._id));

    expect(mockShip).toHaveBeenCalledTimes(1);
    expect(String(mockShip.mock.calls[0][0]._id)).toBe(String(fresh._id));
    const s = await stepsOf(p._id);
    expect(s.SHIPMENT).toMatchObject({ status: 'DONE', detail: '2 shipments' });
    expect(s.SHIPMENT.refs).toHaveLength(2);
    const mail = mockMail.mock.calls[0][0];
    expect(mail.template).toBe('payment-receipt-product');
    expect(mail.subject).toBe(`Order receipt — ${p.invoice_no}`);
    expect(mail.vars.items).toBe('Leash × 2, Leash × 2, Leash × 2');
    expect(mail.vars.orders_url).toMatch(/\/orders$/);
  });

  it('a shipment that never reached ShipRocket fails the step with the order error', async () => {
    const p = await seedCoreDone({ target_type: 'PRODUCT' });
    await seedOrder(p._id);
    mockShip.mockImplementation(async (order: { _id: unknown }) => {
      await ProductOrderModel.updateOne(
        { _id: order._id },
        { $set: { fulfilment_status: 'FAILED', last_error: 'Pincode not serviceable' } }
      );
    });

    await paymentFinalizer.runSideEffects(String(p._id));

    const s = await stepsOf(p._id);
    expect(s.SHIPMENT).toMatchObject({
      status: 'FAILED',
      detail: '1 shipment could not be booked: Pincode not serviceable',
    });
    expect((await PaymentModel.findById(p._id).lean())?.finalize_state).toBe('CORE_DONE');
  });

  it('a pet-store guest: no attribution, a tracking link with the access key, and the store WhatsApp', async () => {
    const p = await seedCoreDone({
      target_type: 'PRODUCT',
      user_id: null,
      metadata: { store: { access_key: 'k&y' } },
    });
    const order = await seedOrder(p._id, { fulfilment_method: 'PICKUP' });
    mockStoreWa.mockRejectedValueOnce(new Error('template not approved'));

    await paymentFinalizer.runSideEffects(String(p._id));

    const s = await stepsOf(p._id);
    expect(s.LINK_ATTRIBUTION).toMatchObject({
      status: 'SKIPPED',
      detail: 'A pet-store guest checkout has no Duncit account',
    });
    expect(shortLinkJourneyService.attributePayment).not.toHaveBeenCalled();
    const { ecommUrl } = await getUrlConfigs();
    expect(mockMail.mock.calls[0][0].vars.orders_url).toBe(
      `${ecommUrl.replace(/\/+$/, '')}/track?order=${order.order_no}&key=k%26y`
    );
    // A WhatsApp failure is best effort — the receipt and the payment stand.
    expect(mockStoreWa).toHaveBeenCalledTimes(1);
    expect(s.RECEIPT_EMAIL.status).toBe('DONE');
    expect((await PaymentModel.findById(p._id).lean())?.finalize_state).toBe('COMPLETE');
  });

  it('a signed-in pet-store buyer is sent to their account orders', async () => {
    const p = await seedCoreDone({ target_type: 'PRODUCT', metadata: { store: { access_key: 'x' } } });
    await seedOrder(p._id, { fulfilment_method: 'PICKUP' });
    await paymentFinalizer.runSideEffects(String(p._id));
    expect(mockMail.mock.calls[0][0].vars.orders_url).toMatch(/\/account\/orders$/);
  });

  it('a Cash-on-Delivery order gets the order confirmation, not a paid receipt', async () => {
    const p = await seedCoreDone({ target_type: 'PRODUCT', gateway: COD_GATEWAY, status: 'PENDING' });
    const order = await seedOrder(p._id, { fulfilment_method: 'PICKUP' });
    await paymentFinalizer.runSideEffects(String(p._id));
    expect(mockMail.mock.calls[0][0]).toMatchObject({
      template: 'store-order-cod',
      subject: `Order confirmed — pay on delivery (${order.order_no})`,
    });
  });
});

describe('runSideEffects — gift cards and everything else', () => {
  it('mails the card to its recipient and the purchaser a receipt without the code', async () => {
    const p = await seedCoreDone({
      target_type: 'GIFT_CARD',
      total: 900,
      metadata: { gift_card: { amount: 1000, recipient_name: 'Ravi', recipient_email: 'ravi@x.com' } },
    });
    mockGiftMail.mockResolvedValue({ to: 'ravi@x.com', cardId: 'card-1' });

    await paymentFinalizer.runSideEffects(String(p._id));

    const s = await stepsOf(p._id);
    expect(s.GIFT_CARD_EMAIL).toMatchObject({ status: 'DONE', detail: 'ravi@x.com', refs: ['card-1'] });
    const { currency_symbol } = await getFinanceSettings();
    const mail = mockMail.mock.calls[0][0];
    expect(mail.template).toBe('payment-receipt-gift-card');
    expect(mail.vars).toMatchObject({ card_amount: `${currency_symbol}1000.00`, recipient: 'Ravi', amount: `${currency_symbol}900.00` });
    expect(JSON.stringify(mail.vars)).not.toMatch(/code/i);
  });

  it('a gift card bought for yourself names the buyer as recipient and falls back to the charge', async () => {
    const p = await seedCoreDone({ target_type: 'GIFT_CARD', total: 750 });
    mockGiftMail.mockResolvedValue({ to: 'self@x.com', cardId: 'card-2' });
    await paymentFinalizer.runSideEffects(String(p._id));
    const { currency_symbol } = await getFinanceSettings();
    expect(mockMail.mock.calls[0][0].vars).toMatchObject({ recipient: 'Asha', card_amount: `${currency_symbol}750.00` });
  });

  it('any other payment gets the generic receipt with its description', async () => {
    const p = await seedCoreDone();
    await paymentFinalizer.runSideEffects(String(p._id));
    const { appUrl } = await getUrlConfigs();
    const mail = mockMail.mock.calls[0][0];
    expect(mail).toMatchObject({ template: 'payment-receipt', subject: `Payment Receipt — ${p.invoice_no}` });
    expect(mail.vars).toMatchObject({ summary: 'Membership top-up', booking_url: appUrl, app_url: appUrl });
  });
});
