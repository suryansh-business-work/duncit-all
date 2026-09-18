import type { RazorpayErrorLike } from '@duncit/utils';

import type { RazorpaySheet } from '../graphql/checkout';
import { STORE_TOKENS } from '../theme/tokens';

const CHECKOUT_JS = 'https://checkout.razorpay.com/v1/checkout.js';

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', listener: (response: { error?: RazorpayErrorLike }) => void) => void;
}

type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

const razorpayGlobal = (): RazorpayCtor | undefined => (globalThis as unknown as { Razorpay?: RazorpayCtor }).Razorpay;

/** Why the sheet did not pay: Razorpay's own error, or `null` when the buyer closed it. */
export class RazorpayFailure extends Error {
  constructor(readonly detail: RazorpayErrorLike | null) {
    super('razorpay-failure');
  }
}

let loading: Promise<RazorpayCtor> | null = null;

/** Load Razorpay's checkout script once; later calls reuse the same promise. */
function loadCheckoutScript(): Promise<RazorpayCtor> {
  const ready = razorpayGlobal();
  if (ready) return Promise.resolve(ready);
  loading ??= new Promise<RazorpayCtor>((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = CHECKOUT_JS;
    tag.async = true;
    tag.addEventListener('load', () => {
      const ctor = razorpayGlobal();
      if (ctor) resolve(ctor);
      else reject(new Error('razorpay-unavailable'));
    });
    tag.addEventListener('error', () => {
      loading = null;
      reject(new Error('razorpay-unavailable'));
    });
    document.body.append(tag);
  });
  return loading;
}

/**
 * Open the hosted payment sheet for an order the server created. Resolves with
 * the signature on success; rejects with a RazorpayFailure carrying Razorpay's
 * error, or `null` when the buyer closed the sheet. Settles exactly once — Razorpay reports a
 * failure and then a dismissal, and only the first is the truth.
 */
export async function payWithRazorpay(sheet: RazorpaySheet): Promise<RazorpaySuccess> {
  const Razorpay = await loadCheckoutScript();
  return new Promise<RazorpaySuccess>((resolve, reject) => {
    let settled = false;
    const fail = (reason: RazorpayErrorLike | null) => {
      if (settled) return;
      settled = true;
      reject(new RazorpayFailure(reason));
    };
    const instance = new Razorpay({
      key: sheet.key_id,
      order_id: sheet.order_id,
      amount: sheet.amount,
      currency: sheet.currency,
      name: sheet.name,
      description: sheet.description,
      prefill: { email: sheet.prefill_email, contact: sheet.prefill_contact },
      theme: { color: STORE_TOKENS.cta },
      handler: (response: RazorpaySuccess) => {
        settled = true;
        resolve(response);
      },
      modal: { ondismiss: () => fail(null) },
    });
    instance.on('payment.failed', (response) => fail(response.error ?? null));
    instance.open();
  });
}
