import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';

import CouponField from '../CouponField';
import CouponsDialog from '../CouponsDialog';
import CoinSummaryRows from '../CoinSummaryRows';
import CoinRedeemField from '../CoinRedeemField';
import DeliveryQuoteNotice from '../DeliveryQuoteNotice';
import GatewayChip from '../GatewayChip';
import ProcessingBackdrop from '../ProcessingBackdrop';
import VenueChargesBox from '../VenueChargesBox';
import VenueChargesDialog from '../VenueChargesDialog';
import { SuccessPodCard, SuccessReceiptCard } from '../SuccessDetails';
import { useCoinRedemption } from '../useCoinRedemption';
import { buildBreakup, formatMoney } from '../checkoutMath';
import { fallbackT } from '../../../i18n/fallback';
import { DELIVERY_QUOTE_BLOCK_KEYS, maxRedeemableCoins, settleBill } from '@duncit/utils';

vi.mock('../../../components/PaymentLottie', () => ({
  default: (p: { variant: string }) => <div data-testid={`lottie-${p.variant}`} />,
}));
vi.mock('../../../utils/dateFormat', async (orig) => ({
  ...(await orig<object>()),
  useDateFormat: () => ({ formatDateTime: (d: string) => `at:${d}` }),
}));

const coupon = (over: object = {}) => ({
  id: 'c1',
  code: 'SAVE10',
  discount_pct: 10,
  description: '',
  scope: 'GLOBAL',
  min_order_amount: 0,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('checkout math', () => {
  it('splits a GST-inclusive total into subtotal, fee and tax, and formats money to two decimals', () => {
    const b = buildBreakup(1180, { gst_pct: 18, platform_fee_pct: 10, currency_symbol: '₹' });
    expect(b).toEqual({ subtotal: 1000, fee: 100, gst: 180, total: 1180, currency: '₹', feePct: 10, gstPct: 18 });
    expect(buildBreakup(0, { gst_pct: 18, platform_fee_pct: 10, currency_symbol: '₹' })?.total).toBe(0);
    expect(buildBreakup(Number.NaN, { gst_pct: 18, platform_fee_pct: 10, currency_symbol: '₹' })?.total).toBe(0);
    expect(buildBreakup(100, null)).toBeNull();
    expect(formatMoney('₹', 5)).toBe('₹5.00');
  });
});

describe('CouponField', () => {
  const field = (over: Partial<React.ComponentProps<typeof CouponField>> = {}) => {
    const spies = { setCode: vi.fn(), onApply: vi.fn(), onRemove: vi.fn() };
    render(<CouponField code="" applied={null} error={null} applying={false} currency="₹" available={[]} {...spies} {...over} />);
    return spies;
  };

  it('upper-cases what is typed, and applies only a non-blank code', () => {
    const { setCode, onApply } = field();
    fireEvent.change(screen.getByTestId('coupon-input'), { target: { value: 'save' } });
    expect(setCode).toHaveBeenCalledWith('SAVE');
    expect(screen.getByTestId('coupon-apply')).toBeDisabled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('applies the typed code and shows the working state', () => {
    const { onApply } = field({ code: 'SAVE' });
    fireEvent.click(screen.getByTestId('coupon-apply'));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith();
  });

  it('disables apply while applying', () => {
    field({ code: 'SAVE', applying: true });
    expect(screen.getByTestId('coupon-apply')).toBeDisabled();
    expect(screen.getByTestId('coupon-apply')).toHaveTextContent(fallbackT('mweb.checkout.couponApplying'));
  });

  it('shows the refusal reason', () => {
    field({ error: 'Expired' });
    expect(screen.getByTestId('coupon-error')).toHaveTextContent('Expired');
  });

  it('shows the applied coupon with its discount and removes it', () => {
    const { onRemove } = field({ applied: { ok: true, code: 'SAVE10', discount_amount: 50 } as never });
    expect(screen.getByTestId('coupon-applied')).toHaveTextContent('SAVE10');
    expect(screen.getByTestId('coupon-applied')).toHaveTextContent('− ₹50.00');
    fireEvent.click(screen.getByTestId('coupon-remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('shows an applied coupon even when the server sent no code', () => {
    field({ applied: { ok: true, discount_amount: 5 } as never });
    expect(screen.getByTestId('coupon-applied')).toBeInTheDocument();
  });

  it('does not treat a refused preview as applied', () => {
    field({ applied: { ok: false, message: 'No' } as never });
    expect(screen.queryByTestId('coupon-applied')).not.toBeInTheDocument();
    expect(screen.getByTestId('coupon-field')).toBeInTheDocument();
  });

  it('offers the available coupons singular or plural, and applies a picked one', () => {
    const { setCode, onApply } = field({ available: [coupon()] as never });
    expect(screen.getByTestId('coupon-view-available')).toHaveTextContent(fallbackT('mweb.checkout.couponsAvailableOne'));
    fireEvent.click(screen.getByTestId('coupon-view-available'));
    fireEvent.click(screen.getByTestId('coupon-pick-SAVE10'));
    expect(setCode).toHaveBeenCalledWith('SAVE10');
    expect(onApply).toHaveBeenCalledWith('SAVE10');
  });

  it('says how many coupons are available when several are', () => {
    field({ available: [coupon(), coupon({ id: 'c2', code: 'B' })] as never });
    expect(screen.getByTestId('coupon-view-available')).toHaveTextContent(fallbackT('mweb.checkout.couponsAvailableMany', { count: 2 }));
  });

  it('offers no list link when there are no coupons', () => {
    field();
    expect(screen.queryByTestId('coupon-view-available')).not.toBeInTheDocument();
  });
});

describe('CouponsDialog', () => {
  const dialog = (coupons: unknown[], currency = '₹') => {
    const spies = { onClose: vi.fn(), onPick: vi.fn() };
    render(<CouponsDialog open coupons={coupons as never} currency={currency} {...spies} />);
    return spies;
  };

  it('says there are no coupons', () => {
    dialog([]);
    expect(screen.getByTestId('coupons-empty')).toHaveTextContent(fallbackT('mweb.checkout.couponsEmpty'));
  });

  it('lists each coupon with its percentage, scope wording and minimum order, and picks by click or keyboard', () => {
    const { onPick, onClose } = dialog([
      coupon({ id: 'a', code: 'A', description: 'Welcome offer', min_order_amount: 500 }),
      coupon({ id: 'b', code: 'B', scope: 'POD' }),
      coupon({ id: 'c', code: 'C' }),
    ]);
    expect(screen.getByTestId('coupon-pick-A')).toHaveTextContent('Welcome offer');
    expect(screen.getByTestId('coupon-pick-A')).toHaveTextContent(fallbackT('mweb.checkout.couponMin', { vars: { amount: '₹500.00' } }));
    expect(screen.getByTestId('coupon-pick-B')).toHaveTextContent(fallbackT('mweb.checkout.couponForPod'));
    expect(screen.getByTestId('coupon-pick-C')).toHaveTextContent(fallbackT('mweb.checkout.couponAllPods'));
    expect(screen.getByTestId('coupon-pick-C')).not.toHaveTextContent('Min');
    fireEvent.click(screen.getByTestId('coupon-pick-A'));
    fireEvent.keyDown(screen.getByTestId('coupon-pick-B'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByTestId('coupon-pick-C'), { key: ' ' });
    fireEvent.keyDown(screen.getByTestId('coupon-pick-C'), { key: 'a' });
    expect(onPick.mock.calls).toEqual([['A'], ['B'], ['C']]);
    fireEvent.click(screen.getByTestId('coupons-sheet-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('CoinSummaryRows', () => {
  it('renders nothing without a summary or when no coins are involved', () => {
    const { container, rerender } = render(<CoinSummaryRows coins={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CoinSummaryRows coins={{ hasAny: false, used: 0, remaining: 0, earning: 0 } as never} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows used, remaining and earning when each applies', () => {
    render(<CoinSummaryRows coins={{ hasAny: true, used: 30, remaining: 70, earning: 5 } as never} />);
    const box = screen.getByTestId('coin-summary');
    expect(box).toHaveTextContent('− 30');
    expect(box).toHaveTextContent('70');
    expect(box).toHaveTextContent('+ 5');
  });

  it('leaves out used and earning rows when they are zero', () => {
    render(<CoinSummaryRows coins={{ hasAny: true, used: 0, remaining: 70, earning: 0 } as never} />);
    const box = screen.getByTestId('coin-summary');
    expect(box).not.toHaveTextContent('−');
    expect(box).not.toHaveTextContent('+');
    expect(box).toHaveTextContent('70');
  });
});

describe('CoinRedeemField', () => {
  const redemption = (over: object = {}) => ({ balance: 100, applied: 0, max: 60, effectiveTotal: 0, roundOff: 0, taxable: 0, onApply: vi.fn(), onRemove: vi.fn(), ...over });

  it('says there are no coins when the balance is empty', () => {
    render(<CoinRedeemField coins={redemption({ balance: 0 }) as never} />);
    expect(screen.getByTestId('coin-redeem-caption')).toHaveTextContent(fallbackT('mweb.coin.checkoutNone'));
    expect(screen.queryByTestId('coin-apply')).not.toBeInTheDocument();
  });

  it('offers the balance and applies the maximum', () => {
    const coins = redemption();
    render(<CoinRedeemField coins={coins as never} />);
    expect(screen.getByTestId('coin-redeem-caption')).toHaveTextContent(fallbackT('mweb.coin.checkoutAvailable', { vars: { coins: 100 } }));
    fireEvent.click(screen.getByTestId('coin-apply'));
    expect(coins.onApply).toHaveBeenCalledTimes(1);
  });

  it('cannot apply when the bill takes no coins', () => {
    render(<CoinRedeemField coins={redemption({ max: 0 }) as never} />);
    expect(screen.getByTestId('coin-apply')).toBeDisabled();
  });

  it('shows what is applied and removes it', () => {
    const coins = redemption({ applied: 40 });
    render(<CoinRedeemField coins={coins as never} />);
    expect(screen.getByTestId('coin-redeem-caption')).toHaveTextContent(fallbackT('mweb.coin.checkoutApplied', { vars: { coins: 40 } }));
    fireEvent.click(screen.getByTestId('coin-remove'));
    expect(coins.onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('useCoinRedemption', () => {
  const run = (balance: number, payable: number, initialApplied = 0) => {
    const removeSpy = vi.fn();
    return renderHook(() => {
      const [coinsApplied, setCoinsApplied] = useState(initialApplied);
      const session = { coinBalance: balance, coinsApplied, setCoinsApplied, removeCoins: () => { removeSpy(); setCoinsApplied(0); } };
      return { ...useCoinRedemption(session as never, payable), coinsApplied, removeSpy };
    });
  };

  it('allows up to the redeemable maximum and charges the settled bill with no coins applied', () => {
    const { result } = run(100, 250.4);
    expect(result.current.max).toBe(maxRedeemableCoins(100, 250.4));
    expect(result.current.applied).toBe(0);
    expect(result.current.effectiveTotal).toBe(settleBill(250.4, 0).payable);
  });

  it('applies the maximum on apply and charges the bill settled with those coins', () => {
    const { result } = run(100, 250.4);
    const max = result.current.max;
    act(() => result.current.onApply());
    expect(result.current.applied).toBe(max);
    expect(result.current.coinsApplied).toBe(max);
    expect(result.current.effectiveTotal).toBe(settleBill(250.4, max).payable);
  });

  it('clamps coins applied to a shrinking bill, in the render and in the stored state', () => {
    const { result } = run(500, 40, 300);
    const max = maxRedeemableCoins(500, 40);
    expect(result.current.applied).toBe(Math.min(300, max));
    expect(result.current.coinsApplied).toBe(max);
    expect(result.current.balance).toBe(500);
    expect(result.current.roundOff).toBe(settleBill(40, max).roundOff);
    expect(result.current.taxable).toBe(settleBill(40, max).taxable);
  });

  it('leaves coins alone when they are within the ceiling and removes them on request', () => {
    const { result } = run(500, 400, 10);
    expect(result.current.coinsApplied).toBe(10);
    act(() => result.current.onRemove());
    expect(result.current.removeSpy).toHaveBeenCalledTimes(1);
    expect(result.current.coinsApplied).toBe(0);
  });
});

describe('DeliveryQuoteNotice', () => {
  it('renders nothing once the charge is known', () => {
    const { container } = render(<DeliveryQuoteNotice status="READY" />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each(['NEEDS_PINCODE', 'CALCULATING'] as const)('explains %s politely as a status', (status) => {
    render(<DeliveryQuoteNotice status={status} />);
    expect(screen.getByTestId('checkout-delivery-pending')).toHaveTextContent(fallbackT(DELIVERY_QUOTE_BLOCK_KEYS[status]));
    expect(screen.getByTestId('checkout-delivery-pending')).toHaveAttribute('role', 'status');
  });

  it('offers a retry when the quote failed and a retry handler exists', () => {
    const onRetry = vi.fn();
    render(<DeliveryQuoteNotice status="FAILED" onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId('checkout-delivery-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('checkout-delivery-failed')).toHaveTextContent(fallbackT(DELIVERY_QUOTE_BLOCK_KEYS.FAILED));
  });

  it('shows the failure without a retry button when no handler was given', () => {
    render(<DeliveryQuoteNotice status="FAILED" />);
    expect(screen.getByTestId('checkout-delivery-failed')).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-delivery-retry')).not.toBeInTheDocument();
  });
});

describe('GatewayChip', () => {
  it('shows Razorpay when live, taking priority over dummy', () => {
    render(<GatewayChip finance={{ razorpay_enabled: true, dummy_mode: true }} />);
    expect(screen.getByTestId('gateway-chip-razorpay')).toBeInTheDocument();
    expect(screen.queryByTestId('gateway-chip-dummy')).not.toBeInTheDocument();
  });

  it('shows Dummy when only dummy mode is on', () => {
    render(<GatewayChip finance={{ razorpay_enabled: false, dummy_mode: true }} />);
    expect(screen.getByTestId('gateway-chip-dummy')).toBeInTheDocument();
  });

  it.each([[{ razorpay_enabled: false, dummy_mode: false }], [undefined], [null]])('shows nothing for %j', (finance) => {
    const { container } = render(<GatewayChip finance={finance} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ProcessingBackdrop', () => {
  it('says processing, and nothing about confirming, while the payment is being submitted', () => {
    render(<ProcessingBackdrop open />);
    expect(screen.getByText(fallbackT('mweb.checkout.processingTitle'))).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-confirming')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('says confirming, with the message, once the payment is being read back', () => {
    render(<ProcessingBackdrop open message="Checking with the bank" />);
    expect(screen.getByText(fallbackT('mweb.checkout.confirmingTitle'))).toBeInTheDocument();
    expect(screen.getByTestId('checkout-confirming')).toHaveTextContent('Checking with the bank');
  });
});

describe('Venue charges', () => {
  const charges = [{ label: 'Court', amount: 200, note: 'Per hour' }, { label: 'Cleaning', amount: 50 }];

  it('shows nothing when there are no venue charges', () => {
    const { container } = render(<VenueChargesBox charges={[]} currency="₹" fmt={(v) => `$${v}`} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the total payable at the venue and opens the itemised dialog, then closes it', () => {
    render(<VenueChargesBox charges={charges} currency="₹" fmt={(v) => `FMT${v}`} />);
    expect(screen.getByTestId('venue-charges-row')).toHaveTextContent('FMT250');
    fireEvent.click(screen.getByTestId('venue-charges-info'));
    const rows = screen.getAllByTestId('venue-charge-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Per hour');
    expect(rows[0]).toHaveTextContent('₹200.00');
    expect(rows[1]).not.toHaveTextContent('Per hour');
    fireEvent.click(screen.getByTestId('venue-charges-sheet-close'));
  });

  it('counts a charge with a missing amount as zero', () => {
    render(<VenueChargesBox charges={[{ label: 'Free', amount: Number.NaN }, { label: 'Fee', amount: 10 }]} currency="₹" fmt={(v) => `FMT${v}`} />);
    expect(screen.getByTestId('venue-charges-row')).toHaveTextContent('FMT10');
  });

  it('explains the charges even with no itemised rows', () => {
    render(<VenueChargesDialog open charges={[]} currency="₹" onClose={vi.fn()} />);
    expect(screen.queryByTestId('venue-charge-row')).not.toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.checkout.venueChargesIntro'))).toBeInTheDocument();
  });

  it('totals the itemised rows in the dialog', () => {
    render(<VenueChargesDialog open charges={charges} currency="₹" onClose={vi.fn()} />);
    expect(screen.getByText(fallbackT('mweb.checkout.venueChargesTotal')).parentElement).toHaveTextContent('₹250.00');
  });
});

describe('SuccessReceiptCard', () => {
  const payment = (over: object = {}) => ({ total: 1180, currency_symbol: '₹', payment_id: 'pay_1', invoice_no: 'INV-1', paid_at: '2026-06-01', created_at: '2026-05-31', ticket_discount_amount: 0, ...over });

  it('shows the amount, paid time, payment id and invoice number', () => {
    render(<SuccessReceiptCard payment={payment()} />);
    expect(screen.getByText('₹1180.00')).toBeInTheDocument();
    expect(screen.getByText('at:2026-06-01')).toBeInTheDocument();
    expect(screen.getByText('pay_1')).toBeInTheDocument();
    expect(screen.getByText('INV-1')).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-success-ticket-discount')).not.toBeInTheDocument();
  });

  it('shows the multi-ticket discount the booking got', () => {
    render(<SuccessReceiptCard payment={payment({ ticket_discount_amount: 100 })} />);
    expect(screen.getByTestId('checkout-success-ticket-discount')).toHaveTextContent('− ₹100.00');
  });

  it('falls back to the created time when unpaid time is missing, and omits the date and invoice when neither exists', () => {
    const { rerender } = render(<SuccessReceiptCard payment={payment({ paid_at: null })} />);
    expect(screen.getByText('at:2026-05-31')).toBeInTheDocument();
    rerender(<SuccessReceiptCard payment={payment({ paid_at: null, created_at: null, invoice_no: null, ticket_discount_amount: null })} />);
    expect(screen.queryByText(/^at:/)).not.toBeInTheDocument();
    expect(screen.queryByText('INV-1')).not.toBeInTheDocument();
  });
});

describe('SuccessPodCard', () => {
  it('shows the pod, offers the two calendar actions and the venue note', () => {
    const onApple = vi.fn();
    const onGoogle = vi.fn();
    render(<SuccessPodCard title="Sunset Jam" when="Sat 6pm" venueNote="Pay ₹50 at the venue" onAppleWallet={onApple} onGoogleCalendar={onGoogle} />);
    expect(screen.getByTestId('confirmation-pod')).toHaveTextContent('Sunset Jam');
    fireEvent.click(screen.getByTestId('success-pod-apple-wallet'));
    fireEvent.click(screen.getByTestId('success-pod-google-wallet'));
    expect(onApple).toHaveBeenCalledTimes(1);
    expect(onGoogle).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('success-venue-note')).toHaveTextContent('Pay ₹50 at the venue');
  });

  it('leaves out the venue note when there are no venue charges', () => {
    render(<SuccessPodCard title="T" when="W" venueNote={null} onAppleWallet={vi.fn()} onGoogleCalendar={vi.fn()} />);
    expect(screen.queryByTestId('success-venue-note')).not.toBeInTheDocument();
  });
});
