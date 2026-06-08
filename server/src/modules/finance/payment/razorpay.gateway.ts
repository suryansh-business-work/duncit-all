import crypto from 'crypto';
import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

/**
 * Razorpay gateway — thin REST wrapper. Credentials are owned by the Tech
 * portal (RAZORPAY env category), never `.env`, so they are always read fresh
 * via {@link getRuntimeEnvValue}. No SDK dependency: order creation is a single
 * REST call and signature checks are plain HMAC.
 */
const RAZORPAY_API = 'https://api.razorpay.com/v1';

export interface RazorpayKeys {
  keyId: string;
  keySecret: string;
}

/** True when a Razorpay key id is configured in the Tech portal. */
export async function isRazorpayConfigured(): Promise<boolean> {
  return !!(await getRuntimeEnvValue('RAZORPAY_KEY_ID'));
}

/** Active Razorpay credentials, or a clear error when the gateway is not set up. */
export async function getRazorpayKeys(): Promise<RazorpayKeys> {
  const [keyId, keySecret] = await Promise.all([
    getRuntimeEnvValue('RAZORPAY_KEY_ID'),
    getRuntimeEnvValue('RAZORPAY_KEY_SECRET'),
  ]);
  if (!keyId || !keySecret) {
    throw new GraphQLError('Razorpay is not configured. Add the keys in the Tech portal.', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
  return { keyId, keySecret };
}

/** Create a Razorpay order. `amountPaise` is the integer amount in the smallest
 * currency unit. Returns the gateway order id. */
export async function createRazorpayOrder(args: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string }> {
  const { keyId, keySecret } = await getRazorpayKeys();
  const auth = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: args.amountPaise,
      currency: args.currency,
      receipt: args.receipt,
      notes: args.notes ?? {},
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json?.id) {
    // Make a 401 unmistakably about the gateway keys, not the user's session.
    const detail = json?.error?.description || `HTTP ${res.status}`;
    const msg =
      res.status === 401
        ? `Razorpay authentication failed — check the Key ID / Key Secret in the Tech portal (${detail})`
        : `Razorpay order failed: ${detail}`;
    throw new GraphQLError(msg, { extensions: { code: 'BAD_GATEWAY' } });
  }
  return { id: String(json.id) };
}

/** Verify a checkout signature: HMAC_SHA256(`order_id|payment_id`, key_secret). */
export async function verifyRazorpaySignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<boolean> {
  const { keySecret } = await getRazorpayKeys();
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(args.signature || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
