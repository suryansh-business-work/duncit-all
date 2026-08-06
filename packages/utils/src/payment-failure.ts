/**
 * What actually went wrong with a payment — the framework-free half, shared by
 * mWeb and the native app (rules 27/40).
 *
 * Both apps used to answer every failure with "Payment was cancelled." A user
 * closing the sheet, a bank declining the card and the gateway timing out are
 * three different events with three different answers, and only one of them
 * risks the buyer's money. Telling someone their payment was cancelled when
 * ₹2,000 has just left their account is the worst of the three to get wrong.
 */

export type PaymentFailureKind =
  /** The buyer closed the sheet. Nothing was charged. */
  | 'CANCELLED'
  /** The gateway did not answer in time. The money MAY have moved. */
  | 'TIMEOUT'
  /** The bank or gateway refused it. Nothing was charged. */
  | 'FAILED';

export interface PaymentFailure {
  kind: PaymentFailureKind;
  /** Razorpay's own code, when it gave one. */
  code: string | null;
  /** Razorpay's own description — shown as the reason, never invented. */
  description: string | null;
  paymentId: string | null;
  orderId: string | null;
  /**
   * Whether this warrants opening a support ticket. TRUE only when the outcome
   * is unknown: a declined card needs a retry, not a case file, and a ticket
   * per declined card would bury the ones that matter.
   */
  raisesTicket: boolean;
}

/** The `error` object Razorpay hands to a `payment.failed` listener. */
export interface RazorpayErrorLike {
  code?: string | null;
  description?: string | null;
  reason?: string | null;
  source?: string | null;
  step?: string | null;
  metadata?: { payment_id?: string | null; order_id?: string | null } | null;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Razorpay says "timed out" several ways; these are the ones it actually uses. */
const TIMEOUT_REASONS = new Set([
  'gateway_timeout',
  'payment_timeout',
  'request_timeout',
  'timeout',
]);
const CANCELLED_REASONS = new Set(['payment_cancelled', 'user_cancelled', 'cancelled']);

/**
 * Classify a failure. `raw` is Razorpay's error object, or null/undefined when
 * the buyer simply closed the sheet — which Razorpay reports by calling
 * `ondismiss` with nothing at all.
 */
export function classifyPaymentFailure(raw: RazorpayErrorLike | null | undefined): PaymentFailure {
  const code = text(raw?.code) || null;
  const description = text(raw?.description) || null;
  const reason = text(raw?.reason).toLowerCase();
  const blob = `${reason} ${text(raw?.description)} ${text(raw?.code)}`.toLowerCase();

  // Nothing to go on means the sheet was closed by hand.
  if (!raw) {
    return { kind: 'CANCELLED', code, description, paymentId: null, orderId: null, raisesTicket: false };
  }

  const timedOut = TIMEOUT_REASONS.has(reason) || /tim(e|ed)\s*.?\s*out/.test(blob);
  const cancelled = CANCELLED_REASONS.has(reason) || /cancelled by (the )?user/.test(blob);

  // Timeout wins over cancelled: a sheet that times out and is then dismissed
  // reports both, and the money is what matters.
  let kind: PaymentFailureKind = 'FAILED';
  if (timedOut) kind = 'TIMEOUT';
  else if (cancelled) kind = 'CANCELLED';

  return {
    kind,
    code,
    description,
    paymentId: text(raw?.metadata?.payment_id) || null,
    orderId: text(raw?.metadata?.order_id) || null,
    raisesTicket: kind === 'TIMEOUT',
  };
}

/** i18n keys for each outcome. The copy lives in the bundle (rule 38). */
export const PAYMENT_FAILURE_KEYS: Record<PaymentFailureKind, { title: string; body: string }> = {
  CANCELLED: { title: 'mweb.payment.cancelledTitle', body: 'mweb.payment.cancelledBody' },
  TIMEOUT: { title: 'mweb.payment.timeoutTitle', body: 'mweb.payment.timeoutBody' },
  FAILED: { title: 'mweb.payment.failedTitle', body: 'mweb.payment.failedBody' },
};

export interface PaymentTicketContext {
  /** What was being paid for, for the agent picking the ticket up. */
  description: string;
  amount?: number | null;
  currencySymbol?: string;
  /** Duncit's own payment document, which is what an agent can actually look up. */
  paymentDocId?: string | null;
}

/**
 * The ticket a timed-out payment opens. Written here rather than at two call
 * sites so an agent gets the same facts whichever app the buyer was using —
 * and so the facts are the ones they can act on: our payment id, Razorpay's,
 * the order, the code and the gateway's own words.
 */
export function paymentTicketDraft(
  failure: PaymentFailure,
  context: PaymentTicketContext
): { subject: string; body_text: string; category: 'PAYMENT' } {
  const amount =
    typeof context.amount === 'number'
      ? `${context.currencySymbol ?? '₹'}${context.amount.toLocaleString('en-IN')}`
      : 'unknown';

  const lines = [
    'A payment did not complete and the gateway did not confirm the outcome.',
    '',
    `What for: ${context.description}`,
    `Amount: ${amount}`,
    `Duncit payment id: ${context.paymentDocId ?? 'not created'}`,
    `Razorpay order id: ${failure.orderId ?? 'not reported'}`,
    `Razorpay payment id: ${failure.paymentId ?? 'not reported'}`,
    `Gateway code: ${failure.code ?? 'not reported'}`,
    `Gateway said: ${failure.description ?? 'nothing'}`,
    '',
    'Raised automatically so the buyer has a reference while the debit is checked.',
  ];

  return {
    subject: `Payment timed out — ${context.description}`,
    body_text: lines.join('\n'),
    category: 'PAYMENT',
  };
}
