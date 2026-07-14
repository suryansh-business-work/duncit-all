import { Types } from 'mongoose';
import { paymentService } from '../../payment.service';
import { PaymentModel } from '../../payment.model';

const makePayment = (over: Record<string, any> = {}) =>
  PaymentModel.create({
    payment_id: `pay_${Math.random().toString(36).slice(2)}`,
    user_id: new Types.ObjectId(),
    user_name: 'A',
    user_email: 'a@a.com',
    billing_address: 'address line',
    checkout_url: 'https://app/checkout',
    target_type: 'OTHER',
    description: 'd',
    subtotal: 100,
    total: 118,
    currency_symbol: '₹',
    status: 'PENDING',
    gateway: 'RAZORPAY',
    gateway_ref: 'order_1',
    ...over,
  });

const verifyArgs = (over: Record<string, any> = {}) => ({
  payment_doc_id: new Types.ObjectId().toString(),
  razorpay_order_id: 'order_1',
  razorpay_payment_id: 'pay_1',
  razorpay_signature: 'sig',
  ...over,
});

describe('paymentService integration', () => {
  it('lists no payments on an empty dataset', async () => {
    expect(await paymentService.list()).toEqual([]);
    expect(await paymentService.listForUser(new Types.ObjectId().toString())).toEqual([]);
  });

  it('returns null for a missing payment id', async () => {
    expect(await paymentService.getById(new Types.ObjectId().toString())).toBeNull();
  });

  it('serves the paymentsTable page with search, filter, sort and paging', async () => {
    await makePayment({ user_name: 'Asha', user_email: 'asha@x.com', status: 'SUCCESS', total: 118 });
    await makePayment({ user_name: 'Bela', user_email: 'bela@x.com', status: 'FAILED', total: 236 });
    await makePayment({ user_name: 'Chitra', user_email: 'chitra@x.com', status: 'SUCCESS', total: 59 });

    // Plain envelope with the clamp defaults (created_at desc).
    const all = await paymentService.table();
    expect(all.total).toBe(3);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans payment_id / invoice_no / user_name / user_email.
    const byName = await paymentService.table({ search: 'bela' });
    expect(byName.rows.map((p) => p.user_name)).toEqual(['Bela']);
    expect(byName.total).toBe(1);

    // Status enum filter narrows (the old UI's status select).
    const success = await paymentService.table({
      filters: [{ field: 'status', op: 'eq', value: 'SUCCESS' }],
    });
    expect(success.total).toBe(2);
    expect(success.rows.every((p) => p.status === 'SUCCESS')).toBe(true);

    // Allowlisted sort + paging keep the total.
    const asc = await paymentService.table({ sort_by: 'total', sort_dir: 'asc' });
    expect(asc.rows.map((p) => p.total)).toEqual([59, 118, 236]);
    const page2 = await paymentService.table({ sort_by: 'total', sort_dir: 'asc', page: 2, page_size: 1 });
    expect(page2.rows.map((p) => p.total)).toEqual([118]);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('createRazorpayCheckout throws when Razorpay is not configured', async () => {
    await expect(
      paymentService.createRazorpayCheckout(
        {
          amount: 100,
          contact_email: 'a@a.com',
          contact_phone_extension: '+91',
          contact_phone_number: '9999999999',
          billing_address: 'address line',
          checkout_url: 'https://app/checkout',
        },
        new Types.ObjectId().toString()
      )
    ).rejects.toThrow(/not configured/i);
  });

  it('verifyRazorpayCheckout rejects a missing payment', async () => {
    await expect(
      paymentService.verifyRazorpayCheckout(verifyArgs(), new Types.ObjectId().toString())
    ).rejects.toThrow(/not found/i);
  });

  it('verifyRazorpayCheckout forbids another user', async () => {
    const doc = await makePayment();
    await expect(
      paymentService.verifyRazorpayCheckout(
        verifyArgs({ payment_doc_id: String(doc._id) }),
        new Types.ObjectId().toString()
      )
    ).rejects.toThrow(/not your payment/i);
  });

  it('verifyRazorpayCheckout rejects an order/gateway mismatch', async () => {
    const doc = await makePayment();
    await expect(
      paymentService.verifyRazorpayCheckout(
        verifyArgs({ payment_doc_id: String(doc._id), razorpay_order_id: 'order_OTHER' }),
        String(doc.user_id)
      )
    ).rejects.toThrow(/mismatch/i);
  });

  it('verifyRazorpayCheckout is idempotent for an already-successful payment', async () => {
    const doc = await makePayment({ status: 'SUCCESS' });
    const res = await paymentService.verifyRazorpayCheckout(
      verifyArgs({ payment_doc_id: String(doc._id) }),
      String(doc.user_id)
    );
    expect(res.status).toBe('SUCCESS');
  });

  describe('invoicePdfBase64 access control', () => {
    it('rejects a missing payment', async () => {
      await expect(
        paymentService.invoicePdfBase64(new Types.ObjectId().toString(), new Types.ObjectId().toString(), false)
      ).rejects.toThrow(/not found/i);
    });

    it('forbids a non-owner, non-admin requester', async () => {
      const doc = await makePayment({ invoice_no: 'INV-1' });
      await expect(
        paymentService.invoicePdfBase64(String(doc._id), new Types.ObjectId().toString(), false)
      ).rejects.toThrow(/not your invoice/i);
    });

    it('lets the owner past the ownership gate (no invoice yet → BAD_REQUEST, not FORBIDDEN)', async () => {
      const doc = await makePayment();
      await expect(
        paymentService.invoicePdfBase64(String(doc._id), String(doc.user_id), false)
      ).rejects.toThrow(/no invoice generated/i);
    });

    it('lets an admin past the ownership gate for another user’s payment', async () => {
      const doc = await makePayment();
      await expect(
        paymentService.invoicePdfBase64(String(doc._id), new Types.ObjectId().toString(), true)
      ).rejects.toThrow(/no invoice generated/i);
    });
  });
});
