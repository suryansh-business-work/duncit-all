import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { createRazorpayOrder, getRazorpayKeys, verifyRazorpaySignature } from '../../razorpay.gateway';

/**
 * A surface may choose one of the Tech portal's Razorpay accounts instead of
 * the default. A payment opened with an account must be charged and checked
 * with that same account's keys — never silently with the default's.
 */

const STORE_SECRET = 'store-account-test-value';

const storeAccount = (over: Record<string, unknown> = {}) =>
  EnvEntryModel.create({
    name: 'Pet store',
    category: 'RAZORPAY',
    config: { key_id: 'rzp_test_PETSTORE01', key_secret: STORE_SECRET },
    ...over,
  });

afterEach(() => {
  delete (globalThis as any).fetch;
});

describe('razorpay.gateway with a chosen account', () => {
  it('reads that account’s keys', async () => {
    const entry = await storeAccount();
    expect(await getRazorpayKeys(String(entry._id))).toEqual({ keyId: 'rzp_test_PETSTORE01', keySecret: STORE_SECRET });
  });

  it('refuses an account that is switched off, missing, not Razorpay or half-filled', async () => {
    const off = await storeAccount({ is_active: false });
    const email = await EnvEntryModel.create({ name: 'Mail', category: 'EMAIL', config: { key_id: 'x', key_secret: 'y' } });
    const noSecret = await storeAccount({ name: 'No secret', config: { key_id: 'rzp_test_NOSECRET00' } });
    const ids = [String(off._id), String(email._id), String(noSecret._id), new Types.ObjectId().toHexString(), 'not-an-id'];

    for (const id of ids) {
      await expect(getRazorpayKeys(id)).rejects.toThrow(
        'The Razorpay account chosen for this payment is missing or switched off in the Tech portal.'
      );
    }
  });

  it('checks a signature with the chosen account’s secret', async () => {
    const entry = await storeAccount();
    const signature = crypto.createHmac('sha256', STORE_SECRET).update('order_77|pay_77').digest('hex');

    const account = String(entry._id);
    expect(await verifyRazorpaySignature({ orderId: 'order_77', paymentId: 'pay_77', signature, account })).toBe(true);
    const forged = crypto.createHmac('sha256', 'another-account').update('order_77|pay_77').digest('hex');
    expect(await verifyRazorpaySignature({ orderId: 'order_77', paymentId: 'pay_77', signature: forged, account })).toBe(false);
  });

  it('opens the order with the chosen account’s credentials', async () => {
    const entry = await storeAccount();
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'order_store_1' }) });
    (globalThis as any).fetch = fetchMock;

    const order = await createRazorpayOrder({ amountPaise: 84900, currency: 'INR', receipt: 'pay_store_1', account: String(entry._id) });

    expect(order.id).toBe('order_store_1');
    const pair = `rzp_test_PETSTORE01:${STORE_SECRET}`;
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(`Basic ${Buffer.from(pair).toString('base64')}`);
  });
});
