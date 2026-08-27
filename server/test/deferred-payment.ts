import { sendEmail } from '../src/services/email/email.service';
import { generateInvoicePdf } from '../src/services/invoice/invoice.pdf';

/**
 * Phase 2 of payment finalization, made testable.
 *
 * The invoice PDF and the receipt email ride phase 2, which `settle`
 * deliberately does NOT await — the mutation answers the moment the money and
 * the seat agree, rather than holding the buyer while a PDF is built. So a test
 * that reads the mock the instant its checkout resolves races the work it is
 * asserting on, and reads an empty `mock.calls`.
 *
 * Both helpers therefore poll, and both key on `payment_id` rather than taking
 * the first call: an EARLIER test's deferred phase 2 can land during this one,
 * and `mockClear()` in a `beforeEach` does not stop it — it only widens the
 * window for it to be mistaken for this test's.
 *
 * The caller's suite must `jest.mock` the two services; these read whatever
 * mocks that installed, so nothing here decides how they are stubbed.
 */
async function pollForCall(
  mock: jest.Mock,
  matches: (arg: any) => boolean,
  what: string,
  paymentId: string
) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const hit = mock.mock.calls.map(([arg]) => arg).find(matches);
    if (hit) return hit;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 20));
  }
  throw new Error(`No ${what} for payment ${paymentId} — phase 2 never ran`);
}

/** The receipt email this payment sent, once it has actually been sent. */
export const receiptForPayment = (paymentId: string) =>
  pollForCall(
    sendEmail as jest.Mock,
    (opts) => opts.vars?.payment_id === paymentId,
    'receipt email',
    paymentId
  );

/** The invoice payload this payment's PDF was built from, once it was built. */
export const invoiceArgsForPayment = (paymentId: string) =>
  pollForCall(
    generateInvoicePdf as jest.Mock,
    (data) => data?.payment_id === paymentId,
    'invoice PDF',
    paymentId
  );
