import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadRazorpay,
  openRazorpayCheckout,
  type RazorpayOrderData,
} from '../razorpayCheckout';

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

const order: RazorpayOrderData = {
  payment_doc_id: 'pd_1',
  key_id: 'rzp_test_key',
  order_id: 'order_1',
  amount: 5000,
  currency: 'INR',
  name: 'Duncit',
  description: 'Pod checkout',
  prefill_email: 'a@b.com',
  prefill_contact: '9999999999',
};

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Razorpay = undefined;
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  vi.restoreAllMocks();
});

describe('loadRazorpay', () => {
  it('resolves immediately when the global already exists', async () => {
    const ctor = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Razorpay = ctor;
    await expect(loadRazorpay()).resolves.toBe(ctor);
  });

  it('injects the script and resolves on load', async () => {
    const promise = loadRazorpay();
    const script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    expect(script).not.toBeNull();
    expect(script?.async).toBe(true);
    // Simulate the script becoming available then firing onload.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Razorpay = vi.fn();
    script?.onload?.(new Event('load'));
    await expect(promise).resolves.toBeTypeOf('function');
  });

  it('rejects when the injected script loads but no global appears', async () => {
    const promise = loadRazorpay();
    const script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    script?.onload?.(new Event('load'));
    await expect(promise).rejects.toThrow('Razorpay failed to load');
  });

  it('rejects when the injected script errors', async () => {
    const promise = loadRazorpay();
    const script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    script?.onerror?.(new Event('error'));
    await expect(promise).rejects.toThrow('Razorpay failed to load');
  });

  it('reuses an existing script tag and resolves on its load event', async () => {
    const existing = document.createElement('script');
    existing.src = SCRIPT_SRC;
    document.body.appendChild(existing);

    const promise = loadRazorpay();
    // No new script should be added.
    expect(document.querySelectorAll(`script[src="${SCRIPT_SRC}"]`).length).toBe(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Razorpay = vi.fn();
    existing.dispatchEvent(new Event('load'));
    await expect(promise).resolves.toBeTypeOf('function');
  });

  it('reuses an existing script tag and rejects on its error event', async () => {
    const existing = document.createElement('script');
    existing.src = SCRIPT_SRC;
    document.body.appendChild(existing);

    const promise = loadRazorpay();
    existing.dispatchEvent(new Event('error'));
    await expect(promise).rejects.toThrow('Razorpay failed to load');
  });
});

describe('openRazorpayCheckout', () => {
  it('constructs Razorpay with mapped options, wires success, and opens the sheet', async () => {
    const open = vi.fn();
    const on = vi.fn();
    let capturedOptions: Record<string, unknown> = {};
    const ctor = vi.fn().mockImplementation((options: Record<string, unknown>) => {
      capturedOptions = options;
      return { open, on };
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Razorpay = ctor;

    const onSuccess = vi.fn();
    const onDismiss = vi.fn();
    await openRazorpayCheckout(order, { onSuccess, onDismiss });

    expect(ctor).toHaveBeenCalledTimes(1);
    expect(capturedOptions.key).toBe(order.key_id);
    expect(capturedOptions.amount).toBe(order.amount);
    expect(capturedOptions.currency).toBe(order.currency);
    expect(capturedOptions.order_id).toBe(order.order_id);
    expect(capturedOptions.prefill).toEqual({
      email: order.prefill_email,
      contact: order.prefill_contact,
    });
    expect(open).toHaveBeenCalledTimes(1);
    expect(on).toHaveBeenCalledWith('payment.failed', expect.any(Function));

    // Fire the success handler.
    const handler = capturedOptions.handler as (sig: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => void;
    handler({
      razorpay_payment_id: 'pay_1',
      razorpay_order_id: 'order_1',
      razorpay_signature: 'sig_1',
    });
    expect(onSuccess).toHaveBeenCalledWith({
      razorpay_payment_id: 'pay_1',
      razorpay_order_id: 'order_1',
      razorpay_signature: 'sig_1',
    });
  });

  it('invokes onDismiss on modal dismiss and on payment.failed', async () => {
    const on = vi.fn();
    let capturedOptions: Record<string, unknown> = {};
    const ctor = vi.fn().mockImplementation((options: Record<string, unknown>) => {
      capturedOptions = options;
      return { open: vi.fn(), on };
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Razorpay = ctor;

    const onDismiss = vi.fn();
    await openRazorpayCheckout(order, { onSuccess: vi.fn(), onDismiss });

    const modal = capturedOptions.modal as { ondismiss: () => void };
    modal.ondismiss();
    expect(onDismiss).toHaveBeenCalledTimes(1);

    // Trigger the payment.failed callback registered via on().
    const [, failedCb] = on.mock.calls.find(([evt]) => evt === 'payment.failed') as [
      string,
      () => void,
    ];
    failedCb();
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
