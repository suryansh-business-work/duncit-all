/**
 * Razorpay browser checkout helper. Lazily loads the official checkout.js and
 * opens the hosted payment sheet for an order created by the server. The key id
 * comes from the server (Tech-portal managed) — never hardcoded here.
 */
const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

type RazorpayConstructor = new (options: Record<string, unknown>) => {
  open: () => void;
  on: (event: string, cb: () => void) => void;
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

/** Open the Razorpay sheet for a created order. `onSuccess` fires with the
 * signature triple to verify server-side; `onDismiss` fires on cancel/failure. */
export async function openRazorpayCheckout(
  order: RazorpayOrderData,
  handlers: { onSuccess: (sig: RazorpaySignature) => void; onDismiss: () => void }
): Promise<void> {
  const Razorpay = await loadRazorpay();
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
    modal: { ondismiss: () => handlers.onDismiss() },
  });
  rzp.on('payment.failed', () => handlers.onDismiss());
  rzp.open();
}
