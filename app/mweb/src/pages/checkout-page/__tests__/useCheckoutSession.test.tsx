import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useCheckoutSession } from '../useCheckoutSession';
import {
  AVAILABLE_COUPONS,
  CHECKOUT_ME,
  MY_PAYMENT,
  PREVIEW_COUPON,
  PUBLIC_FINANCE,
  VERIFY_RAZORPAY_PAYMENT,
} from '../queries';
import { MY_COIN_BALANCE } from '../../duncit-coin-page/queries';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  queries: new Map<unknown, unknown>(),
  verify: vi.fn(),
  preview: vi.fn(),
  myPayment: vi.fn(),
  refetchCoins: vi.fn(),
  confirm: vi.fn(),
  loadRazorpay: vi.fn(),
  form: { reset: vi.fn(), getValues: vi.fn() },
  queryCalls: [] as Array<[unknown, unknown]>,
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (doc: unknown, opts: unknown) => {
    h.queryCalls.push([doc, opts]);
    return h.queries.get(doc) ?? { data: undefined, loading: false };
  },
  useMutation: () => [h.verify, { loading: false }],
  useLazyQuery: (doc: unknown) => [doc === PREVIEW_COUPON ? h.preview : h.myPayment, { loading: false }],
}));
vi.mock('@duncit/utils', async (orig) => ({
  ...(await orig<object>()),
  confirmPaymentAfterTransportFailure: h.confirm,
}));
vi.mock('../razorpayCheckout', () => ({ loadRazorpay: h.loadRazorpay }));
vi.mock('../useCheckoutBillingForm', () => ({
  useCheckoutBillingForm: () => ({
    control: {},
    handleSubmit: vi.fn(),
    getValues: h.form.getValues,
    reset: h.form.reset,
    mainAddress: null,
    hasMainAddress: false,
    persistMainAddress: vi.fn(),
  }),
}));

const setQueries = (over: { finance?: object | null; me?: object | null; coupons?: unknown; coins?: object | null } = {}) => {
  h.queries.clear();
  h.queries.set(PUBLIC_FINANCE, { data: over.finance === undefined ? undefined : { publicFinanceSettings: over.finance }, loading: false });
  h.queries.set(CHECKOUT_ME, { data: over.me === undefined ? undefined : { me: over.me }, loading: false });
  h.queries.set(AVAILABLE_COUPONS, { data: over.coupons === undefined ? undefined : { availableCouponsForPod: over.coupons } });
  h.queries.set(MY_COIN_BALANCE, { data: over.coins === undefined ? undefined : { myCoinBalance: over.coins }, refetch: h.refetchCoins });
};

const session = (args: Partial<Parameters<typeof useCheckoutSession>[0]> = {}) =>
  renderHook(() => useCheckoutSession({ couponPodId: 'pod1', ...args }));

const sig = { razorpay_payment_id: 'pay_1', razorpay_order_id: 'order_1', razorpay_signature: 'sig' };

beforeEach(() => {
  vi.clearAllMocks();
  h.queryCalls.length = 0;
  h.refetchCoins.mockResolvedValue(undefined);
  h.loadRazorpay.mockResolvedValue(undefined);
  h.form.getValues.mockReturnValue({ full_name: 'Existing Name', email: 'a@x.com' });
  setQueries();
});

describe('useCheckoutSession reads', () => {
  it('has safe defaults before anything has loaded', () => {
    const { result } = session();
    expect(result.current.me).toBeUndefined();
    expect(result.current.meContact).toBeNull();
    expect(result.current.coinBalance).toBe(0);
    expect(result.current.coinEarnPct).toBe(0);
    expect(result.current.coinShopEarnPct).toBe(0);
    expect(result.current.availableCoupons).toEqual([]);
    expect(h.loadRazorpay).not.toHaveBeenCalled();
  });

  it('exposes finance, the buyer contact, the coin balance with earn rates and the coupons', () => {
    setQueries({
      finance: { razorpay_enabled: false, currency_symbol: '₹' },
      me: { first_name: 'Jane', last_name: 'Doe', email: 'j@x.com', phone_extension: '+91', phone_number: '98' },
      coupons: [{ code: 'A' }],
      coins: { balance: 120, earn_pct: 5, shop_earn_pct: 2 },
    });
    const { result } = session();
    expect(result.current.finance).toEqual({ razorpay_enabled: false, currency_symbol: '₹' });
    expect(result.current.meContact).toEqual({ fullName: 'Jane Doe', email: 'j@x.com', phoneExtension: '+91', phoneNumber: '98' });
    expect(result.current.coinBalance).toBe(120);
    expect(result.current.coinEarnPct).toBe(5);
    expect(result.current.coinShopEarnPct).toBe(2);
    expect(result.current.availableCoupons).toEqual([{ code: 'A' }]);
  });

  it('builds the contact from whatever the profile has, blank where it has nothing', () => {
    setQueries({ me: { first_name: 'Jane', last_name: null, email: null, phone_extension: null, phone_number: null } });
    expect(session().result.current.meContact).toEqual({ fullName: 'Jane', email: '', phoneExtension: '', phoneNumber: '' });
  });

  it('scopes coupons to the pod, or to none for a global cart', () => {
    session({ couponPodId: 'pod1' });
    const withPod = h.queryCalls.find(([doc]) => doc === AVAILABLE_COUPONS)?.[1] as { variables: { pod_id: string | null } };
    expect(withPod.variables.pod_id).toBe('pod1');
    h.queryCalls.length = 0;
    session({ couponPodId: null });
    const none = h.queryCalls.find(([doc]) => doc === AVAILABLE_COUPONS)?.[1] as { variables: { pod_id: string | null } };
    expect(none.variables.pod_id).toBeNull();
  });

  it('preloads the Razorpay SDK only when it is the live gateway, and ignores a failed preload', async () => {
    setQueries({ finance: { razorpay_enabled: true } });
    h.loadRazorpay.mockRejectedValue(new Error('offline'));
    session();
    await waitFor(() => expect(h.loadRazorpay).toHaveBeenCalledTimes(1));
  });
});

describe('useCheckoutSession coupons', () => {
  it('ignores a blank code and does not ask the server', async () => {
    const { result } = session();
    await act(async () => result.current.applyCoupon(500, '   '));
    expect(h.preview).not.toHaveBeenCalled();
    await act(async () => result.current.applyCoupon(500));
    expect(h.preview).not.toHaveBeenCalled();
  });

  it('previews the typed code, trimmed, for the amount and pod, and keeps an accepted coupon', async () => {
    h.preview.mockResolvedValue({ data: { previewCoupon: { ok: true, code: 'SAVE10', discount: 50 } } });
    const { result } = session();
    act(() => result.current.setCouponCode('  SAVE10 '));
    await act(async () => result.current.applyCoupon(500));
    expect(h.preview).toHaveBeenCalledWith({ variables: { input: { code: 'SAVE10', pod_id: 'pod1', amount: 500 } } });
    expect(result.current.coupon).toEqual({ ok: true, code: 'SAVE10', discount: 50 });
    expect(result.current.couponError).toBeNull();
    expect(result.current.applyingCoupon).toBe(false);
  });

  it('previews a code passed in (picked from the list) over the typed one, and sends no pod for a global cart', async () => {
    h.preview.mockResolvedValue({ data: { previewCoupon: { ok: true, code: 'PICK', discount: 5 } } });
    const { result } = session({ couponPodId: null });
    act(() => result.current.setCouponCode('typed'));
    await act(async () => result.current.applyCoupon(100, 'PICK'));
    expect(h.preview).toHaveBeenCalledWith({ variables: { input: { code: 'PICK', pod_id: null, amount: 100 } } });
  });

  it('shows the server reason when a coupon is refused, and a plain sentence when it gives none', async () => {
    h.preview.mockResolvedValueOnce({ data: { previewCoupon: { ok: false, message: 'Expired' } } });
    const { result } = session();
    await act(async () => result.current.applyCoupon(100, 'OLD'));
    expect(result.current.coupon).toBeNull();
    expect(result.current.couponError).toBe('Expired');
    h.preview.mockResolvedValueOnce({ data: { previewCoupon: { ok: false } } });
    await act(async () => result.current.applyCoupon(100, 'OLD'));
    expect(result.current.couponError).toBe(fallbackT('mweb.checkout.errorCouponInvalid'));
    h.preview.mockResolvedValueOnce({ data: undefined });
    await act(async () => result.current.applyCoupon(100, 'OLD'));
    expect(result.current.couponError).toBe(fallbackT('mweb.checkout.errorCouponInvalid'));
  });

  it('drops a previously accepted coupon and reports the failure when the preview request fails', async () => {
    h.preview.mockResolvedValueOnce({ data: { previewCoupon: { ok: true, code: 'A', discount: 1 } } });
    const { result } = session();
    await act(async () => result.current.applyCoupon(100, 'A'));
    expect(result.current.coupon).not.toBeNull();
    h.preview.mockRejectedValueOnce(new Error('Coupon service down'));
    await act(async () => result.current.applyCoupon(100, 'B'));
    expect(result.current.coupon).toBeNull();
    expect(result.current.couponError).toBe('Coupon service down');
    expect(result.current.applyingCoupon).toBe(false);
  });

  it('removes the coupon, its code and any error', async () => {
    h.preview.mockResolvedValue({ data: { previewCoupon: { ok: false, message: 'No' } } });
    const { result } = session();
    act(() => result.current.setCouponCode('X'));
    await act(async () => result.current.applyCoupon(100));
    act(() => result.current.removeCoupon());
    expect(result.current.coupon).toBeNull();
    expect(result.current.couponCode).toBe('');
    expect(result.current.couponError).toBeNull();
  });

  it('applies and removes coins', () => {
    const { result } = session();
    act(() => result.current.setCoinsApplied(40));
    expect(result.current.coinsApplied).toBe(40);
    act(() => result.current.removeCoins());
    expect(result.current.coinsApplied).toBe(0);
  });
});

describe('useCheckoutSession pickAddress', () => {
  const picked = (over: object = {}) => ({
    name: ' Asha ',
    phone: ' 99 ',
    email: ' a@x.com ',
    line1: '1 Road',
    line2: 'Flat 2',
    landmark: 'Park',
    city: 'Pune',
    state: 'MH',
    pincode: '411001',
    country: 'India',
    ...over,
  });

  it('uses the address-book contact for the parcel and fills the billing fields from it', () => {
    const { result } = session();
    act(() => result.current.pickAddress(picked() as never));
    expect(result.current.pickedContact).toEqual({ name: 'Asha', phone: '99', email: 'a@x.com' });
    expect(h.form.reset).toHaveBeenCalledWith({
      full_name: ' Asha ',
      email: 'a@x.com',
      same_as_main: false,
      line1: '1 Road',
      line2: 'Flat 2',
      landmark: 'Park',
      city: 'Pune',
      state: 'MH',
      pincode: '411001',
      country: 'India',
    });
  });

  it('keeps the form name and defaults the country when the entry has none', () => {
    const { result } = session();
    act(() => result.current.pickAddress(picked({ name: undefined, phone: undefined, email: undefined, country: '' }) as never));
    expect(result.current.pickedContact).toEqual({ name: '', phone: '', email: '' });
    expect(h.form.reset).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Existing Name', country: 'India' }));
  });
});

describe('useCheckoutSession verifyRazorpay', () => {
  it('books the payment on a verified SUCCESS, runs the pre-success hook and refreshes the coin balance', async () => {
    const onBeforeSuccess = vi.fn();
    h.verify.mockResolvedValue({ data: { verifyRazorpayPayment: { status: 'SUCCESS', id: 'p1' } } });
    const { result } = session({ onBeforeSuccess });
    await act(async () => result.current.verifyRazorpay('doc1', sig));
    expect(h.verify).toHaveBeenCalledWith({ variables: { input: { payment_doc_id: 'doc1', ...sig } } });
    expect(onBeforeSuccess).toHaveBeenCalledWith({ status: 'SUCCESS', id: 'p1' });
    expect(result.current.success).toEqual({ status: 'SUCCESS', id: 'p1' });
    expect(result.current.error).toBeNull();
    expect(result.current.submitting).toBe(false);
    expect(h.refetchCoins).toHaveBeenCalledTimes(1);
  });

  it('succeeds without a pre-success hook and survives a failed coin refresh', async () => {
    h.refetchCoins.mockRejectedValue(new Error('x'));
    h.verify.mockResolvedValue({ data: { verifyRazorpayPayment: { status: 'SUCCESS' } } });
    const { result } = session();
    await act(async () => result.current.verifyRazorpay('doc1', sig));
    expect(result.current.success).toEqual({ status: 'SUCCESS' });
  });

  it('does not book anything when the server did not verify the payment', async () => {
    h.verify.mockResolvedValue({ data: { verifyRazorpayPayment: { status: 'FAILED' } } });
    const { result } = session();
    await act(async () => result.current.verifyRazorpay('doc1', sig));
    expect(result.current.success).toBeNull();
    expect(result.current.error).toBe(fallbackT('mweb.checkout.errorNotVerified'));
    h.verify.mockResolvedValue({ data: undefined });
    await act(async () => result.current.verifyRazorpay('doc1', sig));
    expect(result.current.error).toBe(fallbackT('mweb.checkout.errorNotVerified'));
  });

  it('shows a business refusal in the server words and does not poll', async () => {
    h.verify.mockRejectedValue({ graphQLErrors: [{ message: 'Signature mismatch' }], message: 'x' });
    const { result } = session();
    await act(async () => result.current.verifyRazorpay('doc1', sig));
    expect(result.current.error).toBe('Signature mismatch');
    expect(h.confirm).not.toHaveBeenCalled();
    expect(result.current.submitting).toBe(false);
  });

  it('reads the payment back after a transport failure, shows progress meanwhile, and books it when the server says SUCCESS', async () => {
    h.verify.mockRejectedValue(Object.assign(new Error('timeout'), { statusCode: 504 }));
    h.myPayment.mockResolvedValue({ data: { myPayment: { status: 'SUCCESS', id: 'p9' } } });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    h.confirm.mockImplementation(async (opts: { fetchStatus: () => Promise<unknown> }) => {
      await gate;
      return opts.fetchStatus();
    });
    const { result } = session();
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.verifyRazorpay('doc1', sig);
    });
    await waitFor(() => expect(result.current.confirmingMessage).toBe(fallbackT('mweb.checkout.confirmingPayment')));
    expect(result.current.submitting).toBe(true);
    release();
    await act(async () => pending);
    expect(h.myPayment).toHaveBeenCalledWith({ variables: { id: 'doc1' } });
    expect(result.current.success).toEqual({ status: 'SUCCESS', id: 'p9' });
    expect(result.current.confirmingMessage).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('gives each ending its own honest line after a transport failure: failed, refunded, still unknown', async () => {
    h.verify.mockRejectedValue(Object.assign(new Error('timeout'), { statusCode: 504 }));
    const { result } = session();
    const cases: Array<[unknown, string]> = [
      [{ status: 'FAILED' }, 'mweb.checkout.errorConfirmFailed'],
      [{ status: 'REFUNDED' }, 'mweb.checkout.errorConfirmRefunded'],
      [{ status: 'PENDING' }, 'mweb.checkout.errorConfirmPending'],
      [null, 'mweb.checkout.errorConfirmPending'],
    ];
    for (const [row, key] of cases) {
      h.confirm.mockResolvedValueOnce(row);
      await act(async () => result.current.verifyRazorpay('doc1', sig));
      expect(result.current.error).toBe(fallbackT(key));
      expect(result.current.success).toBeNull();
    }
  });

  it('reads a missing payment row as not read yet', async () => {
    h.verify.mockRejectedValue(Object.assign(new Error('timeout'), { statusCode: 504 }));
    h.myPayment.mockResolvedValue({ data: undefined });
    h.confirm.mockImplementation(async (opts: { fetchStatus: () => Promise<unknown> }) => opts.fetchStatus());
    const { result } = session();
    await act(async () => result.current.verifyRazorpay('doc1', sig));
    expect(result.current.error).toBe(fallbackT('mweb.checkout.errorConfirmPending'));
  });
});
