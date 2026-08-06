/**
 * Razorpay browser checkout helper. Lazily loads the official checkout.js and
 * opens the hosted payment sheet for an order created by the server. The key id
 * comes from the server (Tech-portal managed) — never hardcoded here.
 */
import type { RazorpayErrorLike } from '@duncit/utils';

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

type RazorpayConstructor = new (options: Record<string, unknown>) => {
  open: () => void;
  on: (event: string, cb: (response: { error?: RazorpayErrorLike }) => void) => void;
};

declare global {
  // eslint-disable-next-line no-var
  var Razorpay: RazorpayConstructor | undefined;
}

export interface RazorpayOrderData {
  payment_doc_id: string;
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill_email: string;
  prefill_contact: string;
}

export interface RazorpaySignature {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/** Resolve once the Razorpay global is available, injecting the script on first use. */
export function loadRazorpay(): Promise<RazorpayConstructor> {
  if (globalThis.Razorpay) return Promise.resolve(globalThis.Razorpay);
  return new Promise((resolve, reject) => {
    const done = () =>
      globalThis.Razorpay ? resolve(globalThis.Razorpay) : reject(new Error('Razorpay failed to load'));
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', done);
      existing.addEventListener('error', () => reject(new Error('Razorpay failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = done;
    script.onerror = () => reject(new Error('Razorpay failed to load'));
    document.body.appendChild(script);
  });
}

/**
 * Open the Razorpay sheet for a created order. `onSuccess` fires with the
 * signature triple to verify server-side; `onFailure` fires once with whatever
 * Razorpay said went wrong — or `null` when the buyer simply closed the sheet.
 *
 * ONCE is the point. Razorpay fires `payment.failed` and THEN `ondismiss` when
 * the sheet closes after a failure, so a naive wiring reports the failure and
 * immediately overwrites it with "cancelled" — which is how a gateway timeout
 * came to be shown as the buyer's own doing.
 */
export async function openRazorpayCheckout(
  order: RazorpayOrderData,
  handlers: {
    onSuccess: (sig: RazorpaySignature) => void;
    onFailure: (error: RazorpayErrorLike | null) => void;
  }
): Promise<void> {
  const Razorpay = await loadRazorpay();
  let reported = false;
  const report = (error: RazorpayErrorLike | null) => {
    if (reported) return;
    reported = true;
    handlers.onFailure(error);
  };
  const rzp = new Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    name: order.name,
    description: order.description,
    order_id: order.order_id,
    prefill: { email: order.prefill_email, contact: order.prefill_contact },
    theme: { color: '#ff4f73' },
    handler: (res: RazorpaySignature) =>
      handlers.onSuccess({
        razorpay_payment_id: res.razorpay_payment_id,
        razorpay_order_id: res.razorpay_order_id,
        razorpay_signature: res.razorpay_signature,
      }),
    // No error object here: the buyer closed it.
    modal: { ondismiss: () => report(null) },
  });
  rzp.on('payment.failed', (response) => report(response?.error ?? null));
  rzp.open();
}
