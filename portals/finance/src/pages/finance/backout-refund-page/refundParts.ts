import type { useTranslation } from '@duncit/app-settings';
import { fmtDate, money, type BackoutRefundRequest, type RefundPart } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

export interface BreakupLine {
  key: string;
  label: string;
  value: string;
  bold?: boolean;
}

/** One accordion box of the Refund breakup — a way the booking was paid (or the
 * earned-coin revocation), with its own numbers and its own action. */
export interface RefundSection {
  part: RefundPart;
  title: string;
  /** The headline figure shown on the collapsed box. */
  summary: string;
  lines: BreakupLine[];
  processedAt: string | null;
  /** Why the action is unavailable even though the part is pending. */
  blockedReason: string | null;
}

/** Display name of the gateway that took the money half of the booking. */
export function gatewayLabel(gateway: string | null, t: Translate): string {
  switch (gateway) {
    case 'RAZORPAY':
      return t('finance.backoutRefund.methodRazorpay');
    case 'DUMMY':
      return t('finance.backoutRefund.methodTestGateway');
    case 'COUPON':
      return t('finance.backoutRefund.methodCoupon');
    case 'COINS':
      return t('finance.backoutRefund.methodCoins');
    default:
      return t('finance.backoutRefund.methodGateway');
  }
}

/** The request snapshot's deduction %, clamped; the global Default Deductions
 * Backouts % is only a fallback for legacy rows without one. */
export function refundDeductionPct(row: BackoutRefundRequest, fallbackPct: number): number {
  return Math.max(0, Math.min(100, Number(row.deduction_pct ?? fallbackPct) || 0));
}

const wholeCoins = (n: unknown) => Math.max(0, Math.floor(Number(n) || 0));

function cashLines(row: BackoutRefundRequest, symbol: string, pct: number, t: Translate): BreakupLine[] {
  const amount = Number(row.payment_amount ?? 0);
  const deduction = Math.round(amount * pct) / 100; // amount × pct%, 2dp
  const net = row.refund_amount ?? Math.max(0, amount - deduction);
  return [
    { key: 'paid', label: t('finance.backoutRefund.amountPaid'), value: money(symbol, amount) },
    {
      key: 'deduction',
      label: t('finance.backoutRefund.backoutDeduction', { vars: { pct } }),
      value: `- ${money(symbol, deduction)}`,
    },
    { key: 'refund', label: t('finance.backoutRefund.refundPayable'), value: money(symbol, net), bold: true },
  ];
}

// Same percentage as the cash, floored to a whole coin — which is why the
// deducted figure comes from the two stored numbers, not from the rate.
function coinLines(row: BackoutRefundRequest, pct: number, t: Translate): BreakupLine[] {
  const paid = wholeCoins(row.coins_paid);
  const back = wholeCoins(row.coins_refunded);
  return [
    { key: 'coins-paid', label: t('finance.backoutRefund.coinsUsed'), value: String(paid) },
    {
      key: 'coins-deduction',
      label: t('finance.backoutRefund.coinDeduction', { vars: { pct } }),
      value: `- ${paid - back}`,
    },
    { key: 'coins-refund', label: t('finance.backoutRefund.coinsRefundable'), value: String(back), bold: true },
  ];
}

// The member keeps the coins earned on the deducted share — Duncit kept that
// money — so only the rest is revoked. Once processed, what the balance could
// not cover is shown rather than hidden.
function earnLines(row: BackoutRefundRequest, pct: number, t: Translate): BreakupLine[] {
  const earned = wholeCoins(row.coins_earned_share);
  const toRevoke = wholeCoins(row.coins_to_revoke);
  const lines: BreakupLine[] = [
    { key: 'earn-share', label: t('finance.backoutRefund.coinsEarned'), value: String(earned) },
    {
      key: 'earn-kept',
      label: t('finance.backoutRefund.coinsKept', { vars: { pct } }),
      value: `- ${Math.max(0, earned - toRevoke)}`,
    },
    { key: 'earn-revoke', label: t('finance.backoutRefund.coinsToRevoke'), value: String(toRevoke), bold: true },
  ];
  if (row.earn_revoke_processed_at) {
    const revoked = wholeCoins(row.coins_revoked);
    lines.push({ key: 'earn-revoked', label: t('finance.backoutRefund.coinsRevoked'), value: String(revoked) });
    if (revoked < toRevoke) {
      lines.push({
        key: 'earn-shortfall',
        label: t('finance.backoutRefund.coinsNotRecovered'),
        value: String(toRevoke - revoked),
      });
    }
  }
  return lines;
}

/**
 * The Refund breakup as one section per part the server says this refund is
 * actioned in (`refund_parts`): the gateway money, the coins, and the
 * earned-coin revocation — each with its own deduction and its own state.
 */
export function buildRefundSections(
  row: BackoutRefundRequest,
  symbol: string,
  fallbackPct: number,
  t: Translate,
): RefundSection[] {
  const pct = refundDeductionPct(row, fallbackPct);
  const coinsPending = row.pending_refund_parts.includes('COINS');
  const parts = row.refund_parts.length > 0 ? row.refund_parts : (['CASH'] as RefundPart[]);
  return parts.map((part): RefundSection => {
    if (part === 'COINS') {
      const lines = coinLines(row, pct, t);
      return {
        part,
        title: t('finance.backoutRefund.methodCoins'),
        summary: lines[2].value,
        lines,
        processedAt: row.coins_refund_processed_at,
        blockedReason: null,
      };
    }
    if (part === 'EARN_REVOKE') {
      const lines = earnLines(row, pct, t);
      return {
        part,
        title: t('finance.backoutRefund.earnRevokeTitle'),
        summary: `- ${lines[2].value}`,
        lines,
        processedAt: row.earn_revoke_processed_at,
        blockedReason: coinsPending ? t('finance.backoutRefund.coinsFirst') : null,
      };
    }
    const lines = cashLines(row, symbol, pct, t);
    return {
      part,
      title: gatewayLabel(row.payment_gateway, t),
      summary: lines[2].value,
      lines,
      processedAt: row.cash_refund_processed_at,
      blockedReason: null,
    };
  });
}

/** The ways the booking was paid, for the "Paid via" line — the gateway money
 * and/or the coins; the revocation is not a payment method. */
export const paidVia = (sections: RefundSection[]) =>
  sections.filter((section) => section.part !== 'EARN_REVOKE').map((section) => section.title);

export const processedLabel = (at: string | null, t: Translate) =>
  at
    ? t('finance.backoutRefund.partProcessed', { vars: { at: fmtDate(at) } })
    : t('finance.backoutRefund.partPending');
