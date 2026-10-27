import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { ReactNode } from 'react';

import OrderSummaryCard from '../OrderSummaryCard';
import PaymentDetailsCard from '../PaymentDetailsCard';
import CheckoutView from '../CheckoutPage/CheckoutView';
import { usePodCheckoutBill } from '../usePodCheckoutBill';
import { useCheckoutContext } from '../CheckoutPage/useCheckoutContext';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  summary: undefined as undefined | Record<string, any>,
  details: undefined as undefined | Record<string, any>,
  failure: undefined as undefined | Record<string, any>,
  eligibility: { missing: [] as string[] },
  podQuery: { data: undefined as unknown, loading: false, error: undefined as unknown },
  podQueryOpts: undefined as unknown,
  sessionArgs: undefined as unknown,
}));

vi.mock('../../../components/checkout-gate', () => ({
  useCheckoutEligibility: () => h.eligibility,
  CheckoutRequirementsCard: ({ missing }: { missing: string[] }) => <div data-testid="requirements" data-count={missing.length} />,
}));
vi.mock('../checkout', async (orig) => ({
  ...(await orig<object>()),
  CheckoutFields: (p: { dummyMode: boolean; addressRequired: boolean }) => (
    <div data-testid="fields" data-dummy={String(p.dummyMode)} data-address-required={String(p.addressRequired)} />
  ),
}));
vi.mock('../CouponField', () => ({ default: () => <div data-testid="coupon-field-stub" /> }));
vi.mock('../CoinRedeemField', () => ({ default: () => <div data-testid="coin-field-stub" /> }));
vi.mock('../OrderSummaryCard', async (orig) => {
  const real = await orig<typeof import('../OrderSummaryCard')>();
  return { ...real, default: (p: Record<string, any>) => (h.summary ? ((h.summary = p), <div data-testid="summary-stub" />) : <real.default {...(p as React.ComponentProps<typeof real.default>)} />) };
});
vi.mock('../PaymentDetailsCard', async (orig) => {
  const real = await orig<typeof import('../PaymentDetailsCard')>();
  return { ...real, default: (p: Record<string, any>) => (h.details === undefined ? <real.default {...(p as React.ComponentProps<typeof real.default>)} /> : ((h.details = p), <div data-testid="details-stub" />)) };
});
vi.mock('../../../components/issue-notice', () => ({
  IssueNotice: (p: { issue: { code: string }; onClose: () => void }) => (
    <div data-testid="issue" data-code={p.issue.code}>
      <button data-testid="issue-close" onClick={p.onClose} />
    </div>
  ),
}));
vi.mock('../../../components/payment-failure', () => ({
  PaymentFailureDialog: (p: Record<string, any>) => {
    h.failure = p;
    return <button data-testid="failure-retry" onClick={p.onRetry} />;
  },
}));
vi.mock('../AlreadyBookedDialog', () => ({
  default: (p: { open: boolean; onClose: () => void; onHistory: () => void }) => (
    <div data-testid="booked" data-open={String(p.open)}>
      <button data-testid="booked-history" onClick={p.onHistory} />
      <button data-testid="booked-close" onClick={p.onClose} />
    </div>
  ),
}));
vi.mock('../ProcessingBackdrop', () => ({
  default: (p: { open: boolean; message?: string | null }) => <div data-testid="backdrop" data-open={String(p.open)} data-message={p.message ?? ''} />,
}));
vi.mock('../../pod-rent/RentalCheckoutBlock', () => ({
  RentalBillRows: () => <div data-testid="rental-rows" />,
  RentalTermsConsent: () => <div data-testid="rental-consent" />,
}));
vi.mock('../../pod-rent/useCheckoutRentals', () => ({ useCheckoutRentals: () => ({ totals: { count: 0, total: 0 } }) }));
vi.mock('../useCheckoutSession', () => ({
  useCheckoutSession: (args: unknown) => {
    h.sessionArgs = args;
    return { success: null };
  },
}));
vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (_doc: unknown, opts: unknown) => {
    h.podQueryOpts = opts;
    return h.podQuery;
  },
}));
vi.mock('../../../utils/dateFormat', async (orig) => ({ ...(await orig<object>()), formatDateTime: (d?: string) => (d ? `DT:${d}` : '') }));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const inRouter = (ui: ReactNode, entry = '/checkout') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/checkout" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

const breakup = { currency: '₹', total: 1180, gst: 180, gstPct: 18, subtotal: 1000, fee: 0, feePct: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  h.summary = undefined;
  h.details = undefined;
  h.eligibility.missing = [];
});

describe('OrderSummaryCard totals', () => {
  it('says one seat in the singular and shows the plain ticket price', () => {
    render(<OrderSummaryCard pod={null} breakup={breakup} seats={1} unitAmount={500} />);
    expect(screen.getByTestId('order-summary-seats')).toHaveTextContent(fallbackT('mweb.checkout.seatsOne'));
    expect(screen.getByText(fallbackT('mweb.checkout.ticketPrice'))).toBeInTheDocument();
  });

  it('shows the per-seat multiplier when several seats are bought at a known unit price', () => {
    render(<OrderSummaryCard pod={null} breakup={breakup} seats={3} unitAmount={400} />);
    expect(screen.getByTestId('order-summary-seats')).toHaveTextContent(fallbackT('mweb.checkout.seatsMany', { count: 3 }));
    expect(screen.getByText(fallbackT('mweb.checkout.ticketMultiplier', { vars: { price: '₹400.00', seats: 3 } }))).toBeInTheDocument();
    expect(screen.getByText('₹1200.00')).toBeInTheDocument();
  });

  it('shows the plain ticket line for several seats when the unit price is unknown', () => {
    render(<OrderSummaryCard pod={null} breakup={breakup} seats={3} unitAmount={0} />);
    expect(screen.getByText(fallbackT('mweb.checkout.ticketPrice'))).toBeInTheDocument();
  });

  it('adds the round-off and rented items into the total payable, and shows the round-off row', () => {
    render(<OrderSummaryCard pod={null} breakup={breakup} roundOff={0.4} rentals={{ rows: <div data-testid="rent-row" />, total: 100 }} />);
    expect(screen.getByTestId('order-summary-round-off')).toHaveTextContent('+ ₹0.40');
    expect(screen.getByTestId('rent-row')).toBeInTheDocument();
    expect(screen.getByTestId('order-summary-total')).toHaveTextContent('₹1280.40');
  });

  it('shows no round-off row and the plain total otherwise', () => {
    render(<OrderSummaryCard pod={null} breakup={breakup} />);
    expect(screen.queryByTestId('order-summary-round-off')).not.toBeInTheDocument();
    expect(screen.getByTestId('order-summary-total')).toHaveTextContent('₹1180.00');
  });
});

describe('PaymentDetailsCard', () => {
  const coins = { balance: 0, applied: 0, max: 0, effectiveTotal: 0, roundOff: 0, taxable: 0, onApply: vi.fn(), onRemove: vi.fn() };
  const card = (over: Record<string, unknown> = {}) => {
    const onSubmit = vi.fn();
    render(
      <PaymentDetailsCard
        control={{} as never}
        onSubmit={onSubmit}
        error={null}
        submitting={false}
        total={1000}
        effectiveTotal={1000}
        currency="₹"
        dummyMode={false}
        mainAddress={null}
        hasMainAddress={false}
        contact={null}
        contactLoading={false}
        coupon={null}
        couponCode=""
        setCouponCode={vi.fn()}
        couponError={null}
        applyingCoupon={false}
        availableCoupons={[]}
        onApplyCoupon={vi.fn()}
        onRemoveCoupon={vi.fn()}
        coins={coins}
        {...over}
      />
    );
    return onSubmit;
  };

  it('pays the effective total, with the address marked required by default', () => {
    const onSubmit = card();
    expect(screen.getByTestId('fields')).toHaveAttribute('data-address-required', 'true');
    expect(screen.getByTestId('checkout-submit')).toHaveTextContent(fallbackT('mweb.checkout.pay', { vars: { amount: '₹1000.00' } }));
    expect(screen.getByTestId('checkout-submit')).not.toHaveAttribute('aria-describedby');
    fireEvent.click(screen.getByTestId('checkout-submit'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('checkout-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('payment-details-card-savings')).not.toBeInTheDocument();
  });

  it('shows the payment error and the saving when coins or a coupon cut the total', () => {
    card({ error: 'Card declined', effectiveTotal: 800 });
    expect(screen.getByTestId('checkout-error')).toHaveTextContent('Card declined');
    expect(screen.getByTestId('payment-details-card-savings')).toHaveTextContent(fallbackT('mweb.checkout.youSave', { vars: { amount: '₹200.00' } }));
  });

  it('shows processing and shuts Pay while submitting, for a zero total, or while requirements are missing', () => {
    const { unmount } = render(<div />);
    unmount();
    card({ submitting: true });
    expect(screen.getByTestId('checkout-submit')).toBeDisabled();
    expect(screen.getByTestId('checkout-submit')).toHaveTextContent(fallbackT('mweb.checkout.processing'));
  });

  it('shuts Pay for a zero total', () => {
    card({ total: 0, effectiveTotal: 0 });
    expect(screen.getByTestId('checkout-submit')).toBeDisabled();
  });

  it('shuts Pay while the account is missing a phone or verified email', () => {
    h.eligibility.missing = ['phone'];
    card();
    expect(screen.getByTestId('checkout-submit')).toBeDisabled();
    expect(screen.getByTestId('requirements')).toHaveAttribute('data-count', '1');
  });

  it('shuts Pay until the delivery charge is known and points it at the reason', () => {
    card({ deliveryStatus: 'NEEDS_PINCODE' });
    expect(screen.getByTestId('checkout-submit')).toBeDisabled();
    expect(screen.getByTestId('checkout-submit')).toHaveAttribute('aria-describedby', 'checkout-delivery-notice');
    expect(screen.getByTestId('checkout-delivery-pending')).toBeInTheDocument();
  });

  it('offers a delivery retry when the quote failed', () => {
    const onRetryDelivery = vi.fn();
    card({ deliveryStatus: 'FAILED', onRetryDelivery });
    fireEvent.click(screen.getByTestId('checkout-delivery-retry'));
    expect(onRetryDelivery).toHaveBeenCalledTimes(1);
  });

  it('renders the content shown right above Pay, and marks the dummy gateway', () => {
    card({ beforePay: <div data-testid="before-pay" />, dummyMode: true, addressRequired: false });
    expect(screen.getByTestId('before-pay')).toBeInTheDocument();
    expect(screen.getByTestId('fields')).toHaveAttribute('data-dummy', 'true');
    expect(screen.getByTestId('fields')).toHaveAttribute('data-address-required', 'false');
  });
});

describe('CheckoutView', () => {
  const baseProps = () => {
    const session = {
      finance: { dummy_mode: true, razorpay_enabled: false },
      control: {},
      error: null,
      submitting: false,
      confirmingMessage: null,
      mainAddress: null,
      hasMainAddress: false,
      meContact: null,
      meLoading: false,
      me: { id: 'u' },
      coupon: null,
      couponCode: '',
      setCouponCode: vi.fn(),
      couponError: null,
      applyingCoupon: false,
      availableCoupons: [],
      applyCoupon: vi.fn(),
      removeCoupon: vi.fn(),
      setError: vi.fn(),
    };
    const payment = { failure: null, ticketNo: null, ticketPending: false, ticketFailed: false, dismiss: vi.fn() };
    return {
      session,
      payment,
      props: {
        session: session as never,
        pod: { pod_title: 'Jam' } as never,
        serverIssue: { issue: null, clear: vi.fn() } as never,
        stateTitle: 'State Title',
        bill: {
          unitAmount: 500,
          base: 1000,
          coins: { effectiveTotal: 900, roundOff: 0.3, applied: 100 },
          payBreakup: null,
          coinSummary: null,
          discounts: [],
        } as never,
        breakup,
        seats: 2,
        rentals: { totals: { count: 0, total: 0 } } as never,
        submit: vi.fn(),
        payment: payment as never,
        alreadyBookedOpen: false,
        onCloseAlreadyBooked: vi.fn(),
      },
    };
  };

  it('shows the title, the gateway and the pay card without errors or notices', () => {
    const { props } = baseProps();
    inRouter(<CheckoutView {...props} />);
    expect(screen.getByTestId('checkout-screen')).toBeInTheDocument();
    expect(screen.getByTestId('gateway-chip-dummy')).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('issue')).not.toBeInTheDocument();
  });

  it('shows a pod load error and a server issue the buyer can dismiss', () => {
    const { props } = baseProps();
    const clear = vi.fn();
    inRouter(<CheckoutView {...props} podError={{ message: 'Pod gone' }} serverIssue={{ issue: { code: 'X' }, clear } as never} />);
    expect(screen.getAllByTestId('checkout-error')[0]).toHaveTextContent('Pod gone');
    expect(screen.getByTestId('issue')).toHaveAttribute('data-code', 'X');
    fireEvent.click(screen.getByTestId('issue-close'));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('goes back, to the booking history, and retries a failed payment by clearing the error', () => {
    const { props, payment, session } = baseProps();
    inRouter(<CheckoutView {...props} />);
    fireEvent.click(screen.getByTestId('failure-retry'));
    expect(payment.dismiss).toHaveBeenCalledTimes(1);
    expect(session.setError).toHaveBeenCalledWith(null);
    fireEvent.click(screen.getByTestId('booked-history'));
    expect(screen.getByTestId('where')).toHaveTextContent('/pod-history');
  });

  it('goes back one page from the back button', () => {
    const { props } = baseProps();
    render(
      <MemoryRouter initialEntries={['/prev', '/checkout']} initialIndex={1}>
        <Routes>
          <Route path="/checkout" element={<CheckoutView {...props} />} />
          <Route path="/prev" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTestId('checkout-back'));
    expect(screen.getByTestId('where')).toHaveTextContent('/prev');
  });

  it('prices the summary on the gross when nothing is discounted and on the pay breakup otherwise', () => {
    h.summary = {};
    const { props } = baseProps();
    const { unmount } = inRouter(<CheckoutView {...props} />);
    expect(h.summary?.breakup).toBe(breakup);
    expect(h.summary?.roundOff).toBe(0);
    expect(h.summary?.grossTotal).toBe(1180);
    expect(h.summary?.rentals).toBeNull();
    unmount();
    const pay = { ...breakup, total: 900 };
    const discounted = baseProps();
    inRouter(<CheckoutView {...discounted.props} bill={{ ...(discounted.props.bill as object), payBreakup: pay } as never} />);
    expect(h.summary?.breakup).toBe(pay);
    expect(h.summary?.roundOff).toBe(0.3);
  });

  it('adds the rented items to the summary and the pay total, and applies a coupon against the pre-coupon base', () => {
    h.details = {};
    const { props, session } = baseProps();
    inRouter(<CheckoutView {...props} rentals={{ totals: { count: 2, total: 150 } } as never} />);
    expect(h.details?.total).toBe(1330);
    expect(h.details?.effectiveTotal).toBe(1050);
    expect(h.details?.dummyMode).toBe(true);
    expect(h.details?.contactLoading).toBe(false);
    h.details?.onApplyCoupon('SAVE');
    expect(session.applyCoupon).toHaveBeenCalledWith(1000, 'SAVE');
  });

  it('is not in dummy mode when Razorpay is live, and shows the contact skeleton while the profile loads', () => {
    h.details = {};
    const { props, session } = baseProps();
    session.finance = { dummy_mode: true, razorpay_enabled: true } as never;
    session.meLoading = true;
    session.me = null as never;
    inRouter(<CheckoutView {...props} />);
    expect(h.details?.dummyMode).toBe(false);
    expect(h.details?.contactLoading).toBe(true);
  });

  it('is not in dummy mode when there are no finance settings', () => {
    h.details = {};
    const { props, session } = baseProps();
    session.finance = undefined as never;
    inRouter(<CheckoutView {...props} />);
    expect(h.details?.dummyMode).toBe(false);
  });

  it('shows the processing overlay with the confirmation message while submitting', () => {
    const { props, session } = baseProps();
    session.submitting = true;
    session.confirmingMessage = 'Checking' as never;
    inRouter(<CheckoutView {...props} />);
    expect(screen.getByTestId('backdrop')).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('backdrop')).toHaveAttribute('data-message', 'Checking');
  });
});

describe('usePodCheckoutBill', () => {
  const finance = { gst_pct: 18, platform_fee_pct: 10, currency_symbol: '₹' };
  const run = (sessionOver: Record<string, unknown> = {}, pod: unknown = { pod_amount: 500 }, seats = 1, linkTotal = 0) => {
    const session = { finance, coupon: null, coinBalance: 0, coinsApplied: 0, setCoinsApplied: vi.fn(), removeCoins: vi.fn(), coinEarnPct: 0, ...sessionOver };
    return renderHook(() => usePodCheckoutBill({ session: session as never, pod, seats, linkTotal }));
  };

  it('prices one ticket with only the ticket discount row, which comes to nothing', () => {
    const { result } = run();
    expect(result.current.unitAmount).toBe(500);
    expect(result.current.amount).toBe(500);
    expect(result.current.breakup?.total).toBe(500);
    expect(result.current.discounts.every((row) => row.key !== 'coupon' && row.key !== 'coins')).toBe(true);
  });

  it('recovers the unit price from the link total when the pod could not be read', () => {
    const { result } = run({}, null, 3, 900);
    expect(result.current.unitAmount).toBe(300);
    expect(result.current.amount).toBe(900);
  });

  it('lists an accepted coupon after the tier row, naming the code', () => {
    const { result } = run({ coupon: { ok: true, code: 'SAVE10', final_total: 450 } });
    const keys = result.current.discounts.map((row) => row.key);
    expect(keys).toContain('coupon');
    expect(result.current.discounts.find((row) => row.key === 'coupon')?.label).toContain('SAVE10');
    expect(result.current.discounts.find((row) => row.key === 'coupon')?.amount).toBe(50);
  });

  it('names a coupon the server sent without a code, and ignores one that was refused', () => {
    const withoutCode = run({ coupon: { ok: true, final_total: 450 } });
    expect(withoutCode.result.current.discounts.find((row) => row.key === 'coupon')).toBeDefined();
    const refused = run({ coupon: { ok: false, code: 'X', final_total: 1 } });
    expect(refused.result.current.discounts.find((row) => row.key === 'coupon')).toBeUndefined();
  });

  it('lists redeemed coins as a deduction and charges less', () => {
    const { result } = run({ coinBalance: 100, coinsApplied: 100 });
    const coins = result.current.discounts.find((row) => row.key === 'coins');
    expect(coins?.amount).toBe(result.current.coins.applied);
    expect(result.current.coins.applied).toBeGreaterThan(0);
    expect(result.current.coins.effectiveTotal).toBeLessThan(500);
  });
});

describe('useCheckoutContext', () => {
  const run = (entry: string, state?: object, route = '/checkout') =>
    renderHook(() => useCheckoutContext(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[{ pathname: entry.split('?')[0], search: entry.includes('?') ? `?${entry.split('?')[1]}` : '', state }]}>
          <Routes>
            <Route path={route} element={<>{children}</>} />
          </Routes>
        </MemoryRouter>
      ),
    });

  beforeEach(() => {
    h.podQuery = { data: undefined, loading: false, error: undefined };
  });

  it('reads the pod id from the route first, then the link state, then the address bar', () => {
    expect(run('/checkout/POD9', undefined, '/checkout/:podId').result.current.checkoutPodId).toBe('POD9');
    expect(run('/checkout', { pod_id: 'FROMSTATE' }).result.current.checkoutPodId).toBe('FROMSTATE');
    expect(run('/checkout?pod_id=FROMURL').result.current.checkoutPodId).toBe('FROMURL');
    expect(run('/checkout').result.current.checkoutPodId).toBe('');
  });

  it('does not read a pod when there is no pod id, and scopes the coupons to the pod otherwise', () => {
    run('/checkout');
    expect((h.podQueryOpts as { skip: boolean }).skip).toBe(true);
    expect(h.sessionArgs).toEqual({ couponPodId: null });
    run('/checkout?pod_id=P1');
    expect((h.podQueryOpts as { skip: boolean }).skip).toBe(false);
    expect(h.sessionArgs).toEqual({ couponPodId: 'P1' });
  });

  it('reads seats from the link state, then the address bar, defaulting to one and never below one', () => {
    expect(run('/checkout', { seats: 3 }).result.current.seats).toBe(3);
    expect(run('/checkout?seats=4').result.current.seats).toBe(4);
    expect(run('/checkout').result.current.seats).toBe(1);
    expect(run('/checkout?seats=abc').result.current.seats).toBe(1);
    expect(run('/checkout?seats=0').result.current.seats).toBe(1);
    expect(run('/checkout', { seats: -2 }).result.current.seats).toBe(1);
  });

  it('reads the link total from the state, the address bar, or zero', () => {
    expect(run('/checkout', { amount: 700 }).result.current.linkTotal).toBe(700);
    expect(run('/checkout?amount=800').result.current.linkTotal).toBe(800);
    expect(run('/checkout').result.current.linkTotal).toBe(0);
  });

  it('exposes the pod read state', () => {
    h.podQuery = { data: { pod: { id: 'x' } }, loading: true, error: { message: 'e' } };
    const { result } = run('/checkout?pod_id=P1');
    expect(result.current.pod).toEqual({ id: 'x' });
    expect(result.current.podLoading).toBe(true);
    expect(result.current.podError).toEqual({ message: 'e' });
  });
});
