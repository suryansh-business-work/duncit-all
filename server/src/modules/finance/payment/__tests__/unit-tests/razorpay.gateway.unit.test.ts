import crypto from 'crypto';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import {
  createRazorpayOrder,
  getRazorpayKeys,
  isRazorpayConfigured,
  verifyRazorpaySignature,
} from '../../razorpay.gateway';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
const mockEnv = getRuntimeEnvValue as jest.Mock;
const keysSet = () =>
  mockEnv.mockImplementation(async (k: string) =>
    k === 'RAZORPAY_KEY_SECRET' ? 'secret' : 'rzp_test_x'
  );

afterEach(() => {
  delete (global as any).fetch;
});

describe('razorpay.gateway', () => {
  it('isRazorpayConfigured reflects key presence', async () => {
    mockEnv.mockResolvedValueOnce('rzp_test_x');
    expect(await isRazorpayConfigured()).toBe(true);
    mockEnv.mockResolvedValueOnce('');
    expect(await isRazorpayConfigured()).toBe(false);
  });

  it('getRazorpayKeys throws when not configured', async () => {
    mockEnv.mockResolvedValue('');
    await expect(getRazorpayKeys()).rejects.toThrow(/not configured/i);
  });

  it('getRazorpayKeys returns the configured pair', async () => {
    keysSet();
    expect(await getRazorpayKeys()).toEqual({ keyId: 'rzp_test_x', keySecret: 'secret' });
  });

  it('verifies a valid signature and rejects bad ones', async () => {
    keysSet();
    const good = crypto.createHmac('sha256', 'secret').update('order_1|pay_1').digest('hex');
    expect(await verifyRazorpaySignature({ orderId: 'order_1', paymentId: 'pay_1', signature: good })).toBe(true);
    // same length, wrong content
    const wrong = good.slice(0, -1) + (good.endsWith('a') ? 'b' : 'a');
    expect(await verifyRazorpaySignature({ orderId: 'order_1', paymentId: 'pay_1', signature: wrong })).toBe(false);
    // different length
    expect(await verifyRazorpaySignature({ orderId: 'order_1', paymentId: 'pay_1', signature: 'short' })).toBe(false);
  });

  it('createRazorpayOrder posts and returns the order id', async () => {
    keysSet();
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: 'order_123' }) });
    (global as any).fetch = fetchMock;
    const res = await createRazorpayOrder({ amountPaise: 10000, currency: 'INR', receipt: 'r1' });
    expect(res.id).toBe('order_123');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/orders',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('createRazorpayOrder surfaces the gateway error description', async () => {
    keysSet();
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { description: 'bad order' } }) });
    await expect(
      createRazorpayOrder({ amountPaise: 1, currency: 'INR', receipt: 'r1' })
    ).rejects.toThrow(/bad order/);
  });

  it('createRazorpayOrder falls back to a generic error + handles a missing id', async () => {
    keysSet();
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(
      createRazorpayOrder({ amountPaise: 1, currency: 'INR', receipt: 'r1' })
    ).rejects.toThrow(/HTTP 500/);
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await expect(
      createRazorpayOrder({ amountPaise: 1, currency: 'INR', receipt: 'r1', notes: { a: 'b' } })
    ).rejects.toThrow();
  });
});
