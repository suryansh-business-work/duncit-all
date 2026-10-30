import {
  applyBillDiscounts,
  round2,
  smartIncentiveFor,
  ticketDiscountFor,
  type SmartIncentiveQuote,
  type TicketDiscountQuote,
  type TicketDiscountSource,
} from '@duncit/utils';
import type { Translator } from '@duncit/i18n';

import type { CheckoutDiscount } from '@/components/checkout/OrderSummary';
import type { CouponPreview } from '@/hooks/checkoutRequests';
import { useCoinRedemption } from '@/hooks/useCoinRedemption';
import { useTranslation } from '@/hooks/useTranslation';
import { buildBreakup, type FinanceSettings } from '@/utils/checkout-math';

type BillPod = (TicketDiscountSource & { pod_amount?: number | null }) | null | undefined;

/** The buyer's Smart Incentive on the pod (`podSmartIncentive`) — only an
 * unlocked offer takes anything off; null when there is none. */
type BillSmartIncentive = { discount_pct: number; unlocked: boolean } | null | undefined;

/**
 * The deductions, in the order they are taken, for the summary card's own
 * rows: the multi-ticket tier first, then the buyer's unlocked Smart Incentive
 * (on what the tier left), then the coupon (priced on what the incentive
 * left), then coins — 1:1 with the rupee, so the count applied IS the amount
 * off. mWeb twin.
 *
 * They are taken off the ticket gross and stopped at zero, so a coupon (or a
 * coupon plus coins) worth more than the ticket prints only what it actually
 * paid for: the excess is dropped, never refunded and never a negative total.
 */
function buildDiscounts(
  ticket: TicketDiscountQuote,
  incentive: SmartIncentiveQuote,
  seats: number,
  coupon: CouponPreview | null,
  coinsApplied: number,
  t: Translator['t'],
): CheckoutDiscount[] {
  const rows: CheckoutDiscount[] = [];
  if (ticket.amount > 0) {
    rows.push({
      key: 'ticketDiscount',
      label: t('mweb.checkout.ticketDiscount', { vars: { pct: ticket.pct, count: seats } }),
      amount: ticket.amount,
      testID: 'checkout-ticket-discount-row',
    });
  }
  if (incentive.amount > 0) {
    rows.push({
      key: 'smartIncentive',
      label: t('mweb.smartIncentive.checkoutLine', { vars: { pct: incentive.pct } }),
      amount: incentive.amount,
      testID: 'checkout-smart-incentive-row',
    });
  }
  const couponOff = coupon?.ok ? round2(incentive.net - coupon.final_total) : 0;
  if (couponOff > 0) {
    rows.push({
      key: 'coupon',
      label: t('mweb.checkout.couponDiscount', { vars: { code: coupon?.code ?? '' } }),
      amount: couponOff,
    });
  }
  if (coinsApplied > 0) {
    rows.push({ key: 'coins', label: t('mweb.coin.checkoutTitle'), amount: coinsApplied });
  }
  return applyBillDiscounts(ticket.gross, rows).discounts;
}

/**
 * The pod checkout's money, in the server's order (SPEC §5, mWeb identical):
 * ticket gross → minus the multi-ticket tier → minus the buyer's unlocked Smart
 * Incentive → coupon on what is left → Duncit Coins → GST extracted inclusive
 * from the remainder. A preview only — the server re-prices from the pod, the
 * seats and the offer the buyer unlocked.
 */
export function usePodCheckoutBill(
  pod: BillPod,
  seats: number,
  finance: FinanceSettings | null,
  coupon: CouponPreview | null,
  smartIncentive?: BillSmartIncentive,
) {
  const { t } = useTranslation();
  const ticket = ticketDiscountFor(Number(pod?.pod_amount ?? 0), seats, pod ?? {});
  // Compounds with the tier: its % comes off what the tier left. An offer the
  // buyer never unlocked takes nothing.
  const incentive = smartIncentiveFor(
    ticket.net,
    smartIncentive?.unlocked ? smartIncentive.discount_pct : 0,
  );
  // The bill before any discount — the multiplier line and the struck-through total.
  const breakup = buildBreakup(ticket.gross, finance);
  // The coupon discounts what both pod discounts left; coins redeem against its result.
  const payableAfterCoupon = coupon?.ok ? coupon.final_total : incentive.net;
  const coins = useCoinRedemption(payableAfterCoupon);
  // What is actually charged, broken up the same way: every deduction cuts the
  // GROSS and the server re-quotes on what is left, so the tax drops with it.
  // Broken up on the TAXABLE value: the round-off that takes the charge to a
  // whole rupee is not taxed, so it is its own row and never inside these lines.
  const payBreakup = buildBreakup(coins.taxable, finance);
  const discounts = buildDiscounts(ticket, incentive, seats, coupon, coins.applied, t);
  return { ticket, incentive, breakup, coins, payBreakup, discounts };
}
