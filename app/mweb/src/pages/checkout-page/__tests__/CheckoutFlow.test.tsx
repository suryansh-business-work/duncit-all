import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import CheckoutFlow from '../CheckoutPage/CheckoutFlow';
import { CREATE_RAZORPAY_ORDER, DUMMY_CHECKOUT } from '../queries';
import { checkoutDefaults } from '../checkout';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  razorpayOrder: vi.fn(),
  dummy: vi.fn(),
  openRazorpay: vi.fn(),
  capture: vi.fn(),
  clear: vi.fn(),
  report: vi.fn(),
  failureFactory: undefined as undefined | (() => { description: string; amount: number; currencySymbol?: string }),
  viewProps: undefined as undefined | Record<string, any>,
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useMutation: (doc: unknown) => [doc === CREATE_RAZORPAY_ORDER ? h.razorpayOrder : h.dummy, { loading: false }],
}));
vi.mock('../razorpayCheckout', () => ({ openRazorpayCheckout: h.openRazorpay }));
vi.mock('../../../components/issue-notice', () => ({
  useServerIssue: () => ({ capture: h.capture, clear: h.clear, issue: null }),
  IssueNotice: () => null,
}));
vi.mock('../../../components/payment-failure', () => ({
  usePaymentFailure: (factory: () => { description: string; amount: number; currencySymbol?: string }) => {
    h.failureFactory = factory;
    return { report: h.report, failure: null, dismiss: vi.fn() };
  },
  PaymentFailureDialog: () => null,
}));
vi.mock('../CheckoutPage/CheckoutView', () => ({
  default: (p: Record<string, any>) => {
    h.viewProps = p;
    return (
      <div data-testid="view" data-booked={String(p.alreadyBookedOpen)}>
        <button data-testid="submit" onClick={() => p.submit()} />
        <button data-testid="close-booked" onClick={p.onCloseAlreadyBooked} />
      </div>
    );
  },
}));
vi.mock('../CheckoutSuccess', () => ({
  default: (p: { payment: { id: string }; rentalDepositRefundable: boolean; onHome: () => void; onProfile: () => void }) => (
    <div data-testid="success" data-id={p.payment.id} data-refundable={String(p.rentalDepositRefundable)}>
      <button data-testid="go-home" onClick={p.onHome} />
      <button data-testid="go-profile" onClick={p.onProfile} />
    </div>
  ),
}));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const makeSession = (over: Record<string, any> = {}) => {
  const s: Record<string, any> = {
    finance: { dummy_mode: true, razorpay_enabled: false },
    financeLoading: false,
    success: null,
    coupon: null,
    me: { address: { line1: 'Home' } },
    setError: vi.fn(),
    setSubmitting: vi.fn(),
    finishSuccess: vi.fn(),
    verifyRazorpay: vi.fn().mockResolvedValue(undefined),
    persistMainAddress: vi.fn().mockResolvedValue(undefined),
    handleSubmit: (fn: (v: unknown) => unknown) => () => fn({ ...checkoutDefaults, full_name: ' Jane ', email: 'J@X.com', phone_number: '98', line1: '1 St', city: 'Pune', state: 'MH', pincode: '411001' }),
    ...over,
  };
  return s;
};
const makeCtx = (over: Record<string, any> = {}) => ({
  state: {},
  search: new URLSearchParams(),
  checkoutPodId: 'pod1',
  pod: { pod_title: 'Sunset Jam' },
  podLoading: false,
  podError: undefined,
  session: makeSession(),
  rentals: { blocked: false, selections: [], settings: undefined, totals: { count: 0, total: 0 } },
  seats: 2,
  ...over,
});
const makeBill = (over: Record<string, any> = {}) => ({
  unitAmount: 500,
  amount: 1000,
  base: 1000,
  breakup: { total: 1180, currency: '₹' },
  coins: { applied: 30 },
  payBreakup: null,
  coinSummary: null,
  discounts: [],
  ...over,
});

const flow = (ctx: ReturnType<typeof makeCtx>, bill: ReturnType<typeof makeBill> = makeBill()) =>
  render(
    <MemoryRouter initialEntries={['/checkout']}>
      <Routes>
        <Route path="/checkout" element={<CheckoutFlow ctx={ctx as never} bill={bill as never} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
const pay = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId('submit'));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  h.viewProps = undefined;
  h.openRazorpay.mockResolvedValue(undefined);
  h.report.mockResolvedValue(undefined);
  h.dummy.mockResolvedValue({ data: { dummyCheckout: { status: 'SUCCESS', id: 'pay1' } } });
});

describe('CheckoutFlow states', () => {
  it('shows the confirmation once paid, navigating home or to the profile, with the deposit refundable by default', () => {
    flow(makeCtx({ session: makeSession({ success: { id: 'pay1' } }) }));
    expect(screen.getByTestId('success')).toHaveAttribute('data-id', 'pay1');
    expect(screen.getByTestId('success')).toHaveAttribute('data-refundable', 'true');
    fireEvent.click(screen.getByTestId('go-profile'));
    expect(screen.getByTestId('where')).toHaveTextContent('/profile');
  });

  it('goes home from the confirmation, and shows a non-refundable deposit when the rental settings say so', () => {
    flow(makeCtx({ session: makeSession({ success: { id: 'p' } }), rentals: { blocked: false, selections: [], settings: { deposit_refundable: false }, totals: { count: 0, total: 0 } } }));
    expect(screen.getByTestId('success')).toHaveAttribute('data-refundable', 'false');
    fireEvent.click(screen.getByTestId('go-home'));
    expect(screen.getByTestId('where')).toHaveTextContent('/');
  });

  it('says there is nothing to check out with no pod and no amount, and goes home', () => {
    flow(makeCtx({ checkoutPodId: '' }));
    expect(screen.getByTestId('checkout-unavailable')).toHaveTextContent(fallbackT('mweb.checkout.nothingToCheckout'));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.checkout.backToHome') }));
    expect(screen.getByTestId('where')).toHaveTextContent('/');
  });

  it('checks out a link that carries only an amount', () => {
    flow(makeCtx({ checkoutPodId: '', state: { amount: 500 } }));
    expect(screen.getByTestId('view')).toBeInTheDocument();
  });

  it.each([
    ['the finance settings are loading', { session: makeSession({ financeLoading: true }) }, makeBill()],
    ['the pod is loading', { podLoading: true }, makeBill()],
    ['the bill is not priced yet', {}, makeBill({ breakup: null })],
  ])('shows the skeleton while %s', (_name, ctxOver, bill) => {
    flow(makeCtx(ctxOver), bill);
    expect(screen.getByTestId('checkout-loading')).toBeInTheDocument();
  });

  it('describes a failed payment with the pod and bill total, or generic wording without a pod', () => {
    flow(makeCtx());
    expect(h.failureFactory?.()).toEqual({ description: 'Pod: Sunset Jam', amount: 1180, currencySymbol: '₹' });
  });

  it('falls back to the payable amount and generic description when the bill and pod are missing', () => {
    flow(makeCtx({ pod: null }), makeBill({ breakup: null }));
    expect(h.failureFactory?.()).toEqual({ description: 'Pod checkout', amount: 1000, currencySymbol: undefined });
  });

  it('closes the already-booked dialog', async () => {
    h.dummy.mockRejectedValue(new Error('x'));
    h.capture.mockReturnValue({ code: 'ALREADY_BOOKED' });
    flow(makeCtx());
    await pay();
    await waitFor(() => expect(screen.getByTestId('view')).toHaveAttribute('data-booked', 'true'));
    fireEvent.click(screen.getByTestId('close-booked'));
    expect(screen.getByTestId('view')).toHaveAttribute('data-booked', 'false');
  });
});

describe('CheckoutFlow dummy gateway', () => {
  it('pays in one round trip with the contact and billing, then shows success', async () => {
    const ctx = makeCtx();
    flow(ctx);
    await pay();
    expect(ctx.session.persistMainAddress).toHaveBeenCalledTimes(1);
    const input = h.dummy.mock.calls[0][0].variables.input;
    expect(input).toMatchObject({
      pod_id: 'pod1',
      amount: 1000,
      seats: 2,
      description: 'Pod booking · Sunset Jam',
      contact_name: 'Jane',
      contact_email: 'j@x.com',
      redeem_coins: 30,
      coupon_code: null,
      selected_rentals: [],
      simulate_failure: false,
    });
    expect(input.billing.line1).toBe('1 St');
    expect(ctx.session.finishSuccess).toHaveBeenCalledWith({ status: 'SUCCESS', id: 'pay1' });
    expect(ctx.session.setError).toHaveBeenCalledWith(null);
    expect(ctx.session.setSubmitting).toHaveBeenLastCalledWith(false);
  });

  it('reports a failed payment and sends the applied coupon code only when it was accepted', async () => {
    h.dummy.mockResolvedValue({ data: { dummyCheckout: { status: 'FAILED' } } });
    const ctx = makeCtx({ session: makeSession({ coupon: { ok: true, code: 'SAVE' } }) });
    flow(ctx);
    await pay();
    expect(h.dummy.mock.calls[0][0].variables.input.coupon_code).toBe('SAVE');
    expect(ctx.session.setError).toHaveBeenLastCalledWith(fallbackT('mweb.checkout.errorFailed'));
    expect(ctx.session.finishSuccess).not.toHaveBeenCalled();
  });

  it('treats an empty answer as a failure, and does not send a coupon that was not accepted', async () => {
    h.dummy.mockResolvedValue({ data: undefined });
    const ctx = makeCtx({ session: makeSession({ coupon: { ok: false, code: 'NOPE' } }) });
    flow(ctx);
    await pay();
    expect(h.dummy.mock.calls[0][0].variables.input.coupon_code).toBeNull();
    expect(ctx.session.setError).toHaveBeenLastCalledWith(fallbackT('mweb.checkout.errorFailed'));
  });

  it('names the booking from the link state, the address bar or a default, and uses the link description', async () => {
    const withState = makeCtx({ pod: null, state: { pod_title: 'From State', description: 'Custom desc' } });
    const { unmount } = flow(withState);
    await pay();
    expect(h.dummy.mock.calls[0][0].variables.input.description).toBe('Custom desc');
    unmount();
    h.dummy.mockClear();
    const withSearch = makeCtx({ pod: null, search: new URLSearchParams('title=From+URL') });
    const second = flow(withSearch);
    await pay();
    expect(h.dummy.mock.calls[0][0].variables.input.description).toBe('Pod booking · From URL');
    second.unmount();
    h.dummy.mockClear();
    flow(makeCtx({ pod: null, checkoutPodId: '', state: { amount: 5 } }));
    await pay();
    expect(h.dummy.mock.calls[0][0].variables.input).toMatchObject({ description: 'Pod booking · Booking', pod_id: null });
  });

  it('uses the pod title from a pod record without a title as a fallback to the state title', async () => {
    flow(makeCtx({ pod: { pod_title: '' }, state: { pod_title: 'State Title' } }));
    await pay();
    expect(h.dummy.mock.calls[0][0].variables.input.description).toBe('Pod booking · State Title');
  });
});

describe('CheckoutFlow razorpay gateway', () => {
  const live = () => makeSession({ finance: { razorpay_enabled: true, dummy_mode: false } });

  it('creates the order and opens the hosted sheet, verifying on its success callback', async () => {
    const order = { payment_doc_id: 'doc1', free: false, payment: null };
    h.razorpayOrder.mockResolvedValue({ data: { createRazorpayOrder: order } });
    const ctx = makeCtx({ session: live() });
    flow(ctx);
    await pay();
    expect(h.dummy).not.toHaveBeenCalled();
    expect(ctx.session.setSubmitting).toHaveBeenCalledWith(false);
    expect(h.openRazorpay).toHaveBeenCalledTimes(1);
    const handlers = h.openRazorpay.mock.calls[0][1];
    expect(h.openRazorpay.mock.calls[0][0]).toBe(order);
    const sig = { razorpay_payment_id: 'p', razorpay_order_id: 'o', razorpay_signature: 's' };
    await handlers.onSuccess(sig);
    expect(ctx.session.verifyRazorpay).toHaveBeenCalledWith('doc1', sig);
    const error = new Error('card declined');
    handlers.onFailure(error);
    expect(h.report).toHaveBeenCalledWith(error);
  });

  it('survives a failure report that itself fails', async () => {
    h.report.mockRejectedValue(new Error('report down'));
    h.razorpayOrder.mockResolvedValue({ data: { createRazorpayOrder: { payment_doc_id: 'd', free: false, payment: null } } });
    flow(makeCtx({ session: live() }));
    await pay();
    h.openRazorpay.mock.calls[0][1].onFailure(new Error('x'));
    await act(async () => undefined);
    expect(h.report).toHaveBeenCalled();
  });

  it('settles a booking that is already paid in full without opening the sheet', async () => {
    const payment = { status: 'SUCCESS', id: 'free1' };
    h.razorpayOrder.mockResolvedValue({ data: { createRazorpayOrder: { payment_doc_id: 'd', free: true, payment } } });
    const ctx = makeCtx({ session: live() });
    flow(ctx);
    await pay();
    expect(ctx.session.finishSuccess).toHaveBeenCalledWith(payment);
    expect(h.openRazorpay).not.toHaveBeenCalled();
  });

  it('opens the sheet for a free-flagged order that carries no payment row', async () => {
    h.razorpayOrder.mockResolvedValue({ data: { createRazorpayOrder: { payment_doc_id: 'd', free: true, payment: null } } });
    const ctx = makeCtx({ session: live() });
    flow(ctx);
    await pay();
    expect(ctx.session.finishSuccess).not.toHaveBeenCalled();
    expect(h.openRazorpay).toHaveBeenCalledTimes(1);
  });

  it('tells the buyer the payment could not start when the server returns no order', async () => {
    h.razorpayOrder.mockResolvedValue({ data: { createRazorpayOrder: null } });
    const ctx = makeCtx({ session: live() });
    flow(ctx);
    await pay();
    expect(ctx.session.setError).toHaveBeenLastCalledWith(fallbackT('mweb.checkout.errorStart'));
    expect(h.openRazorpay).not.toHaveBeenCalled();
    h.razorpayOrder.mockResolvedValue({ data: undefined });
    await pay();
    expect(ctx.session.setError).toHaveBeenLastCalledWith(fallbackT('mweb.checkout.errorStart'));
  });
});

describe('CheckoutFlow guards and failures', () => {
  it('refuses to pay until rental terms are accepted, without touching the profile or the gateway', async () => {
    const ctx = makeCtx({ rentals: { blocked: true, selections: [], settings: undefined, totals: { count: 0, total: 0 } } });
    flow(ctx);
    await pay();
    expect(ctx.session.setError).toHaveBeenCalledWith(fallbackT('venueRentals.guest.agreeRequired'));
    expect(ctx.session.persistMainAddress).not.toHaveBeenCalled();
    expect(h.dummy).not.toHaveBeenCalled();
    expect(ctx.session.setSubmitting).not.toHaveBeenCalled();
  });

  it('says the gateway is not configured when neither is live, and releases the submit lock', async () => {
    const ctx = makeCtx({ session: makeSession({ finance: { razorpay_enabled: false, dummy_mode: false } }) });
    flow(ctx);
    await pay();
    expect(ctx.session.setError).toHaveBeenLastCalledWith(fallbackT('mweb.checkout.errorNotConfigured'));
    expect(ctx.session.setSubmitting).toHaveBeenLastCalledWith(false);
  });

  it('says the gateway is not configured when finance settings are missing altogether', async () => {
    const ctx = makeCtx({ session: makeSession({ finance: undefined }) });
    flow(ctx);
    await pay();
    expect(ctx.session.setError).toHaveBeenLastCalledWith(fallbackT('mweb.checkout.errorNotConfigured'));
  });

  it('captures a failed Razorpay order under its own operation name and keeps the sheet closed', async () => {
    h.razorpayOrder.mockRejectedValue(new Error('boom'));
    h.capture.mockReturnValue({ code: 'SERVER_ERROR' });
    const ctx = makeCtx({ session: makeSession({ finance: { razorpay_enabled: true } }) });
    flow(ctx);
    await pay();
    expect(h.capture).toHaveBeenCalledWith(expect.any(Error), 'createRazorpayOrder');
    expect(screen.getByTestId('view')).toHaveAttribute('data-booked', 'false');
    expect(h.clear).not.toHaveBeenCalled();
    expect(ctx.session.setSubmitting).toHaveBeenLastCalledWith(false);
  });

  it('captures a failed dummy checkout under its operation name', async () => {
    h.dummy.mockRejectedValue(new Error('boom'));
    h.capture.mockReturnValue({ code: 'SERVER_ERROR' });
    flow(makeCtx());
    await pay();
    expect(h.capture).toHaveBeenCalledWith(expect.any(Error), 'dummyCheckout');
  });

  it('opens the already-booked dialog instead of a generic error when the seat is already booked', async () => {
    h.dummy.mockRejectedValue(new Error('x'));
    h.capture.mockReturnValue({ code: 'ALREADY_BOOKED' });
    flow(makeCtx());
    await pay();
    expect(h.clear).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('view')).toHaveAttribute('data-booked', 'true'));
  });
});
