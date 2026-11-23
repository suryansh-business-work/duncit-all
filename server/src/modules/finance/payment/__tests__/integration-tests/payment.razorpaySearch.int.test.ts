import { Types } from 'mongoose';
import { PaymentModel } from '../../payment.model';
import { isRazorpayIdTerm, razorpayPaymentRefs, razorpaySearchAlso } from '../../payment.razorpaySearch';
import { CoinTransactionModel } from '@modules/finance/coin/coin.model';
import { coinAdminService } from '@modules/finance/coin/coin.admin.service';
import { RentalBookingModel } from '@modules/venues/venueRental/rentalBooking.model';
import { rentalBookingTableService } from '@modules/venues/venueRental/rentalBookingTable.service';

/**
 * A Razorpay id copied from the dashboard must find its row in every log
 * table. Coin, rental (and gift card, shop order, backout) rows only point at
 * the payment, by its Duncit ref or its `_id`, so the pasted id is resolved
 * to the payment first and matched through that reference.
 */
let seq = 0;
const makePayment = (over: Record<string, unknown> = {}) =>
  PaymentModel.create({
    payment_id: `DPAY-rzpsearch-${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Asha',
    user_email: 'asha@x.com',
    billing_address: 'address line',
    checkout_url: 'https://app/checkout',
    target_type: 'POD',
    description: 'Pod booking',
    subtotal: 7.63,
    total: 9,
    currency_symbol: '₹',
    status: 'SUCCESS',
    gateway: 'RAZORPAY',
    ...over,
  });

const coinRow = (payment_id: string | null, reason = 'Booking reward') =>
  CoinTransactionModel.create({
    user_id: new Types.ObjectId(),
    type: 'CREDIT',
    amount: 5,
    balance_after: 5,
    source: 'PAYMENT_EARN',
    reason,
    payment_id,
  });

const rentalRow = (payment: { _id: Types.ObjectId; payment_id: string }, name = 'Badminton racket') =>
  RentalBookingModel.create({
    payment_doc_id: payment._id,
    payment_ref: payment.payment_id,
    pod_id: new Types.ObjectId(),
    venue_id: new Types.ObjectId(),
    user_id: new Types.ObjectId(),
    item_id: new Types.ObjectId(),
    name,
    rate: 100,
    units: 1,
    quantity: 1,
    rent_amount: 100,
    status: 'BOOKED',
  });

describe('isRazorpayIdTerm', () => {
  it.each(['pay_U39NBNks4J5RtV', 'order_Qx81', 'rfnd_9aB'])('accepts the Razorpay id %s', (term) => {
    expect(isRazorpayIdTerm(term)).toBe(true);
  });

  it.each(['pay_', 'order_', 'Asha', 'DPAY-123', 'xpay_U39', ''])('rejects %p', (term) => {
    expect(isRazorpayIdTerm(term)).toBe(false);
  });
});

describe('razorpayPaymentRefs', () => {
  it('finds a payment by each place a Razorpay id is stored', async () => {
    const byMeta = await makePayment({ metadata: { razorpay_payment_id: 'pay_meta1', razorpay_order_id: 'order_meta1' } });
    const byRef = await makePayment({ gateway_ref: 'pay_ref1' });
    const byRefund = await makePayment({ metadata: { razorpay_refund_ids: ['rfnd_one', 'rfnd_two'] } });
    await makePayment({ gateway_ref: 'pay_other' });

    const cases: [string, string][] = [
      ['pay_meta1', byMeta.payment_id],
      ['order_meta1', byMeta.payment_id],
      ['pay_ref1', byRef.payment_id],
      ['rfnd_two', byRefund.payment_id],
    ];
    for (const [term, ref] of cases) {
      const found = await razorpayPaymentRefs(`  ${term}  `);
      expect(found.refs).toEqual([ref]);
      expect(found.docIds).toHaveLength(1);
    }
  });

  it('matches the whole id only, never a fragment of another', async () => {
    await makePayment({ gateway_ref: 'pay_U39NBNks4J5RtV' });
    expect((await razorpayPaymentRefs('pay_U39N')).refs).toEqual([]);
  });

  it('does not read payments for a term that is not a Razorpay id', async () => {
    const find = jest.spyOn(PaymentModel, 'find');
    try {
      expect(await razorpayPaymentRefs('Asha')).toEqual({ docIds: [], refs: [] });
      expect(await razorpayPaymentRefs(null)).toEqual({ docIds: [], refs: [] });
      expect(find).not.toHaveBeenCalled();
    } finally {
      find.mockRestore();
    }
  });

  it('gives no extra search clause when the id names no payment', async () => {
    expect(await razorpaySearchAlso('pay_nobody', 'payment_id', 'ref')).toEqual([]);
  });
});

describe('log tables searched by a Razorpay id', () => {
  it('Duncit Coin ledger finds the rows of the payment by its Razorpay payment id', async () => {
    const paid = await makePayment({ metadata: { razorpay_payment_id: 'pay_coin1' } });
    const other = await makePayment({ metadata: { razorpay_payment_id: 'pay_coin2' } });
    await coinRow(paid.payment_id);
    await coinRow(other.payment_id);
    await coinRow(null, 'Admin grant');

    const page = await coinAdminService.table({ search: 'pay_coin1' });
    expect(page.total).toBe(1);
    expect(page.rows[0].payment_id).toBe(paid.payment_id);
  });

  it('Duncit Coin ledger still searches its own fields', async () => {
    const paid = await makePayment();
    await coinRow(paid.payment_id, 'Festive bonus');
    await coinRow(null, 'Admin grant');

    expect((await coinAdminService.table({ search: 'festive' })).total).toBe(1);
    expect((await coinAdminService.table({ search: paid.payment_id })).total).toBe(1);
  });

  it('venue rentals find the booking by the Razorpay order id through the payment _id', async () => {
    const paid = await makePayment({ gateway_ref: 'pay_rent1', metadata: { razorpay_order_id: 'order_rent1' } });
    const other = await makePayment({ gateway_ref: 'pay_rent2' });
    const mine = await rentalRow(paid);
    await rentalRow(other);

    const page = await rentalBookingTableService.financeTable({ search: 'order_rent1' });
    expect(page.total).toBe(1);
    expect(page.rows[0].id).toBe(String(mine._id));
    expect((await rentalBookingTableService.financeTable({ search: 'pay_rent1' })).total).toBe(1);
  });
});
