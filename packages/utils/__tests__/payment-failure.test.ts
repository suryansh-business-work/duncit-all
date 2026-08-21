import { describe, expect, it } from 'vitest';
import {
  PAYMENT_FAILURE_KEYS,
  classifyPaymentFailure,
  paymentTicketDraft,
  type PaymentFailure,
  type PaymentFailureKind,
  type RazorpayErrorLike,
} from '../src/payment-failure';

/** Razorpay's `payment.failed` error, shaped like a bank decline unless overridden. */
const rzpError = (over: Partial<RazorpayErrorLike> = {}): RazorpayErrorLike => ({
  code: 'BAD_REQUEST_ERROR',
  description: 'Your payment has been declined by the bank.',
  reason: 'payment_failed',
  source: 'bank',
  step: 'payment_authorization',
  metadata: { payment_id: 'pay_123', order_id: 'order_456' },
  ...over,
});

/** A classified failure with every gateway fact present. */
const failure = (over: Partial<PaymentFailure> = {}): PaymentFailure => ({
  kind: 'TIMEOUT',
  code: 'GATEWAY_ERROR',
  description: 'Request timed out',
  paymentId: 'pay_123',
  orderId: 'order_456',
  raisesTicket: true,
  ...over,
});

describe('classifyPaymentFailure', () => {
  describe('the buyer closing the sheet', () => {
    // Razorpay calls `ondismiss` with nothing at all; that silence IS the signal.
    it('reads a missing error as a cancellation that charged nothing', () => {
      for (const raw of [null, undefined]) {
        expect(classifyPaymentFailure(raw)).toEqual({
          kind: 'CANCELLED',
          code: null,
          description: null,
          paymentId: null,
          orderId: null,
          raisesTicket: false,
        });
      }
    });

    it("recognises each of Razorpay's own cancellation reasons", () => {
      for (const reason of ['payment_cancelled', 'user_cancelled', 'cancelled']) {
        const result = classifyPaymentFailure(rzpError({ reason, description: 'Payment processing' }));
        expect(result.kind).toBe('CANCELLED');
        expect(result.raisesTicket).toBe(false);
      }
    });

    it('matches the reason regardless of letter case', () => {
      expect(classifyPaymentFailure(rzpError({ reason: 'Payment_Cancelled', description: '' })).kind).toBe(
        'CANCELLED',
      );
    });

    it('falls back to the gateway wording when no reason code is given', () => {
      expect(
        classifyPaymentFailure(rzpError({ reason: null, description: 'Payment processing cancelled by user' }))
          .kind,
      ).toBe('CANCELLED');
      expect(
        classifyPaymentFailure(rzpError({ reason: null, description: 'Cancelled by the user' })).kind,
      ).toBe('CANCELLED');
    });

    // The words count wherever Razorpay puts them: a free-text reason that is
    // not one of its known codes is still read, not skipped for the description.
    it('reads "cancelled by user" from the reason field when it is not a known code', () => {
      const result = classifyPaymentFailure(
        rzpError({ reason: 'Cancelled by user', description: 'Payment processing' }),
      );
      expect(result.kind).toBe('CANCELLED');
      expect(result.raisesTicket).toBe(false);
    });

    // "Cancelled" is not always the buyer: a bank backing out is a decline and
    // the answer is "retry", not "you closed the sheet".
    it('does not mistake a bank-side cancellation for the buyer closing the sheet', () => {
      const result = classifyPaymentFailure(
        rzpError({ reason: 'payment_failed', description: 'Transaction cancelled by the bank' }),
      );
      expect(result.kind).toBe('FAILED');
    });
  });

  describe('the gateway timing out', () => {
    it("recognises each of Razorpay's own timeout reasons and opens a ticket", () => {
      for (const reason of ['gateway_timeout', 'payment_timeout', 'request_timeout', 'timeout']) {
        const result = classifyPaymentFailure(rzpError({ reason, description: 'Something happened' }));
        expect(result.kind).toBe('TIMEOUT');
        expect(result.raisesTicket).toBe(true);
      }
    });

    it('reads "timed out" from the description when the reason is something else', () => {
      expect(classifyPaymentFailure(rzpError({ description: 'Payment timed out' })).kind).toBe('TIMEOUT');
      expect(classifyPaymentFailure(rzpError({ description: 'Request TIME OUT' })).kind).toBe('TIMEOUT');
      expect(classifyPaymentFailure(rzpError({ description: 'Gateway time-out' })).kind).toBe('TIMEOUT');
    });

    it('reads "timed out" from the reason field when it is not one of the known codes', () => {
      const result = classifyPaymentFailure(
        rzpError({ reason: 'Bank timed out', description: 'Payment processing' }),
      );
      expect(result.kind).toBe('TIMEOUT');
      expect(result.raisesTicket).toBe(true);
    });

    it('reads a timeout from the error code alone', () => {
      const result = classifyPaymentFailure(
        rzpError({ code: 'GATEWAY_TIMEOUT', reason: null, description: null }),
      );
      expect(result.kind).toBe('TIMEOUT');
      expect(result.raisesTicket).toBe(true);
    });

    // A sheet that times out and is then dismissed reports both; the money is
    // what matters, so the unknown outcome wins over the harmless one.
    it('lets a timeout win over a cancellation when both are reported', () => {
      const result = classifyPaymentFailure(
        rzpError({ reason: 'payment_cancelled', description: 'Request timed out' }),
      );
      expect(result.kind).toBe('TIMEOUT');
      expect(result.raisesTicket).toBe(true);
    });
  });

  describe('a plain decline', () => {
    it('is FAILED, carries the gateway facts verbatim and opens no ticket', () => {
      // A declined card needs a retry, not a case file.
      expect(classifyPaymentFailure(rzpError())).toEqual({
        kind: 'FAILED',
        code: 'BAD_REQUEST_ERROR',
        description: 'Your payment has been declined by the bank.',
        paymentId: 'pay_123',
        orderId: 'order_456',
        raisesTicket: false,
      });
    });

    // Razorpay only signals a dismissal by sending nothing; an object with no
    // details is still a reported failure, not the buyer closing the sheet.
    it('treats an error object with no details as a failure, not a cancellation', () => {
      expect(classifyPaymentFailure({})).toEqual({
        kind: 'FAILED',
        code: null,
        description: null,
        paymentId: null,
        orderId: null,
        raisesTicket: false,
      });
    });
  });

  describe('the facts it carries', () => {
    it('nulls an empty or non-string code and description rather than inventing one', () => {
      const result = classifyPaymentFailure(
        rzpError({ code: '', description: 42 as unknown as string, reason: undefined }),
      );
      expect(result.code).toBeNull();
      expect(result.description).toBeNull();
      expect(result.kind).toBe('FAILED');
    });

    it('nulls the Razorpay ids when the metadata is missing, null or empty', () => {
      const missing = classifyPaymentFailure(rzpError({ metadata: undefined }));
      expect(missing.paymentId).toBeNull();
      expect(missing.orderId).toBeNull();

      const nulled = classifyPaymentFailure(rzpError({ metadata: null }));
      expect(nulled.paymentId).toBeNull();
      expect(nulled.orderId).toBeNull();

      const empty = classifyPaymentFailure(rzpError({ metadata: { payment_id: '', order_id: null } }));
      expect(empty.paymentId).toBeNull();
      expect(empty.orderId).toBeNull();
    });

    it('keeps the Razorpay ids when they are reported', () => {
      const result = classifyPaymentFailure(
        rzpError({ metadata: { payment_id: 'pay_abc', order_id: 'order_xyz' } }),
      );
      expect(result.paymentId).toBe('pay_abc');
      expect(result.orderId).toBe('order_xyz');
    });

    it('raises a ticket ONLY when the outcome is unknown', () => {
      const byKind = {
        TIMEOUT: classifyPaymentFailure(rzpError({ reason: 'gateway_timeout' })),
        CANCELLED: classifyPaymentFailure(rzpError({ reason: 'payment_cancelled' })),
        FAILED: classifyPaymentFailure(rzpError()),
      };
      expect(byKind.TIMEOUT.raisesTicket).toBe(true);
      expect(byKind.CANCELLED.raisesTicket).toBe(false);
      expect(byKind.FAILED.raisesTicket).toBe(false);
    });
  });
});

describe('PAYMENT_FAILURE_KEYS', () => {
  const kinds: PaymentFailureKind[] = ['CANCELLED', 'TIMEOUT', 'FAILED'];

  it('names the bundle keys each outcome renders with', () => {
    // These are the contract with MWEB_BUNDLE (rule 38): renaming one here
    // without the bundle leaves the sheet showing a raw key.
    expect(PAYMENT_FAILURE_KEYS).toEqual({
      CANCELLED: { title: 'mweb.payment.cancelledTitle', body: 'mweb.payment.cancelledBody' },
      TIMEOUT: { title: 'mweb.payment.timeoutTitle', body: 'mweb.payment.timeoutBody' },
      FAILED: { title: 'mweb.payment.failedTitle', body: 'mweb.payment.failedBody' },
    });
  });

  it('gives every outcome its own title and body so no two failures read alike', () => {
    const all = kinds.flatMap((kind) => [PAYMENT_FAILURE_KEYS[kind].title, PAYMENT_FAILURE_KEYS[kind].body]);
    expect(new Set(all).size).toBe(all.length);
    for (const key of all) {
      expect(key.startsWith('mweb.payment.')).toBe(true);
    }
  });
});

describe('paymentTicketDraft', () => {
  const context = {
    description: 'Pod ticket — Sunset Yoga',
    amount: 2000,
    currencySymbol: '₹',
    paymentDocId: 'PAY-77',
  };

  it('files under PAYMENT with a subject that names what was being paid for', () => {
    const draft = paymentTicketDraft(failure(), context);
    expect(draft.category).toBe('PAYMENT');
    expect(draft.subject).toBe('Payment timed out — Pod ticket — Sunset Yoga');
  });

  it('lists every fact an agent can act on, in the order they look them up', () => {
    // Our own payment id first — that is the one an agent can actually open —
    // then Razorpay's order, its payment, the code and its own words.
    expect(paymentTicketDraft(failure(), context).body_text).toBe(
      [
        'A payment did not complete and the gateway did not confirm the outcome.',
        '',
        'What for: Pod ticket — Sunset Yoga',
        'Amount: ₹2,000',
        'Duncit payment id: PAY-77',
        'Razorpay order id: order_456',
        'Razorpay payment id: pay_123',
        'Gateway code: GATEWAY_ERROR',
        'Gateway said: Request timed out',
        '',
        'Raised automatically so the buyer has a reference while the debit is checked.',
      ].join('\n'),
    );
  });

  it('formats the amount with Indian grouping and the rupee sign by default', () => {
    const lines = paymentTicketDraft(failure(), { description: 'Shop order', amount: 125000 }).body_text.split(
      '\n',
    );
    expect(lines).toContain('Amount: ₹1,25,000');
  });

  it('uses the caller-supplied currency symbol when one is given', () => {
    const lines = paymentTicketDraft(failure(), {
      description: 'Shop order',
      amount: 50,
      currencySymbol: '$',
    }).body_text.split('\n');
    expect(lines).toContain('Amount: $50');
  });

  it('still prints a zero amount as a number rather than unknown', () => {
    const lines = paymentTicketDraft(failure(), { description: 'Free add-on', amount: 0 }).body_text.split(
      '\n',
    );
    expect(lines).toContain('Amount: ₹0');
  });

  it('says the amount is unknown when the caller has none', () => {
    for (const amount of [null, undefined]) {
      const lines = paymentTicketDraft(failure(), { description: 'Shop order', amount }).body_text.split('\n');
      expect(lines).toContain('Amount: unknown');
    }
  });

  it('says so plainly when a fact was never reported instead of printing null', () => {
    // The agent must be able to tell "Razorpay gave nothing" from "we forgot
    // to include it" — so each gap has its own words.
    const lines = paymentTicketDraft(
      failure({ code: null, description: null, paymentId: null, orderId: null }),
      { description: 'Pod ticket', amount: 500, paymentDocId: null },
    ).body_text.split('\n');
    expect(lines).toContain('Duncit payment id: not created');
    expect(lines).toContain('Razorpay order id: not reported');
    expect(lines).toContain('Razorpay payment id: not reported');
    expect(lines).toContain('Gateway code: not reported');
    expect(lines).toContain('Gateway said: nothing');
  });

  it('treats a payment document that was never created the same as an omitted one', () => {
    const lines = paymentTicketDraft(failure(), { description: 'Pod ticket', amount: 500 }).body_text.split(
      '\n',
    );
    expect(lines).toContain('Duncit payment id: not created');
  });
});
