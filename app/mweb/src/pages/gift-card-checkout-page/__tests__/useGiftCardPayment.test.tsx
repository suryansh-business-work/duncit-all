import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useGiftCardPayment } from '../useGiftCardPayment';
import { CHECKOUT_ME, PUBLIC_FINANCE } from '../../checkout-page/queries';

const h = vi.hoisted(() => ({
  queries: new Map<unknown, unknown>(),
  loadRazorpay: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (doc: unknown) => h.queries.get(doc) ?? { data: undefined, loading: false },
  useMutation: () => [vi.fn(), { loading: false }],
}));
vi.mock('../../checkout-page/razorpayCheckout', () => ({
  loadRazorpay: h.loadRazorpay,
  openRazorpayCheckout: vi.fn(),
}));
vi.mock('../../checkout-page/useCheckoutBillingForm', () => ({
  useCheckoutBillingForm: () => ({ control: {}, handleSubmit: vi.fn(), getValues: vi.fn(), reset: vi.fn() }),
}));

const withFinance = (finance: object | undefined) => {
  h.queries.clear();
  h.queries.set(PUBLIC_FINANCE, { data: finance ? { publicFinanceSettings: finance } : undefined, loading: false });
  h.queries.set(CHECKOUT_ME, { data: { me: null }, loading: false });
};

beforeEach(() => {
  vi.clearAllMocks();
  h.loadRazorpay.mockResolvedValue(undefined);
});

describe('useGiftCardPayment Razorpay preload', () => {
  it('fetches the Razorpay script once Razorpay is the live gateway', async () => {
    withFinance({ razorpay_enabled: true, dummy_mode: false });
    renderHook(() => useGiftCardPayment({ onPaymentFailure: vi.fn() }));
    await waitFor(() => expect(h.loadRazorpay).toHaveBeenCalledTimes(1));
  });

  it('does not fetch it for the dummy gateway or before the settings arrive', () => {
    withFinance({ razorpay_enabled: false, dummy_mode: true });
    renderHook(() => useGiftCardPayment({ onPaymentFailure: vi.fn() }));
    withFinance(undefined);
    renderHook(() => useGiftCardPayment({ onPaymentFailure: vi.fn() }));
    expect(h.loadRazorpay).not.toHaveBeenCalled();
  });

  it('keeps the page working when the preload fails (Pay loads the script again)', async () => {
    h.loadRazorpay.mockRejectedValue(new Error('offline'));
    withFinance({ razorpay_enabled: true });
    const { result } = renderHook(() => useGiftCardPayment({ onPaymentFailure: vi.fn() }));
    await waitFor(() => expect(h.loadRazorpay).toHaveBeenCalledTimes(1));
    expect(result.current).toBeTruthy();
  });
});
