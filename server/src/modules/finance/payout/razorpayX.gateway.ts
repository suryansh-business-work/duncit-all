import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { getRazorpayKeys } from '@modules/finance/payment/razorpay.gateway';

/**
 * RazorpayX payouts — the money-OUT half of Razorpay. The Razorpay account
 * keys and webhook secret are the ones the payments gateway already reads from
 * the Tech portal; the only extra setting is the RazorpayX current-account
 * number the money leaves from (RAZORPAY → "RazorpayX Account Number").
 *
 * Every call is one REST request; there is no SDK. Nothing here touches our own
 * database — {@link ./payout.dispatch} owns the idempotency and the state.
 */
const RAZORPAY_API = 'https://api.razorpay.com/v1';

export type PayoutMode = 'UPI' | 'IMPS' | 'NEFT';

/** Where a payout lands: a bank account, or a UPI address. */
export type PayoutDestination =
  | { kind: 'BANK'; name: string; account_number: string; ifsc: string }
  | { kind: 'UPI'; name: string; upi_id: string };

/** What a payout is for — Razorpay's own `purpose` vocabulary. */
export type PayoutPurpose = 'payout' | 'salary' | 'refund' | 'vendor bill' | 'utility bill' | 'cashback';

/** A payout as far as this system reads it — nothing about the bank account. */
export interface RazorpayPayoutSummary {
  id: string;
  /** queued | pending | rejected | processing | processed | cancelled | reversed | failed */
  status: string;
  utr: string;
  failure_reason: string;
  reference_id: string;
}

export type PayoutOutcome = 'PROCESSING' | 'PAID' | 'FAILED';

const text = (value: unknown): string => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');

/** Razorpay's payout status, collapsed to the three states this system tracks. Pure. */
export function payoutOutcomeOf(status: string): PayoutOutcome {
  switch (status) {
    case 'processed':
      return 'PAID';
    case 'rejected':
    case 'cancelled':
    case 'reversed':
    case 'failed':
      return 'FAILED';
    default:
      return 'PROCESSING';
  }
}

/** The RazorpayX account number, or '' when payouts are not set up. */
export async function payoutAccountNumber(): Promise<string> {
  return (await getRuntimeEnvValue('RAZORPAYX_ACCOUNT_NUMBER')).trim();
}

/** True when keys and the RazorpayX account are both in place. */
export async function isPayoutConfigured(): Promise<boolean> {
  if (!(await payoutAccountNumber())) return false;
  try {
    await getRazorpayKeys();
    return true;
  } catch {
    return false;
  }
}

async function authHeader(): Promise<string> {
  const { keyId, keySecret } = await getRazorpayKeys();
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}

/** One RazorpayX call. Failures carry Razorpay's own description, never the request body. */
async function call(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string }
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { Authorization: await authHeader(), 'Content-Type': 'application/json' };
  if (init.idempotencyKey) headers['X-Payout-Idempotency'] = init.idempotencyKey;
  const res = await outboundFetch('RazorpayX', `${RAZORPAY_API}${path}`, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) return json;
  const error = (json.error ?? {}) as Record<string, unknown>;
  const detail = text(error.description) || `HTTP ${res.status}`;
  throw new GraphQLError(
    res.status === 401
      ? `Razorpay authentication failed — check the Key ID / Key Secret in the Tech portal (${detail})`
      : `RazorpayX rejected the request: ${detail}`,
    { extensions: { code: res.status >= 500 ? 'BAD_GATEWAY' : 'BAD_REQUEST', razorpay_status: res.status } }
  );
}

/** Create a RazorpayX contact for the payee. `reference` ties it back to our record. */
export async function createContact(args: { name: string; email?: string; reference: string }): Promise<string> {
  const json = await call('/contacts', {
    method: 'POST',
    body: {
      name: args.name.slice(0, 50),
      email: args.email || undefined,
      type: 'vendor',
      reference_id: args.reference.slice(0, 40),
    },
  });
  const id = text(json.id);
  if (!id) throw new GraphQLError('RazorpayX did not return a contact id.', { extensions: { code: 'BAD_GATEWAY' } });
  return id;
}

/** Register the destination under a contact. */
export async function createFundAccount(contactId: string, destination: PayoutDestination): Promise<string> {
  const body =
    destination.kind === 'UPI'
      ? { contact_id: contactId, account_type: 'vpa', vpa: { address: destination.upi_id } }
      : {
          contact_id: contactId,
          account_type: 'bank_account',
          bank_account: {
            name: destination.name.slice(0, 120),
            ifsc: destination.ifsc,
            account_number: destination.account_number,
          },
        };
  const json = await call('/fund_accounts', { method: 'POST', body });
  const id = text(json.id);
  if (!id) throw new GraphQLError('RazorpayX did not return a fund account id.', { extensions: { code: 'BAD_GATEWAY' } });
  return id;
}

function summaryOf(json: Record<string, unknown>): RazorpayPayoutSummary {
  return {
    id: text(json.id),
    status: text(json.status),
    utr: text(json.utr),
    failure_reason: text(json.failure_reason ?? (json.status_details as Record<string, unknown> | undefined)?.description),
    reference_id: text(json.reference_id),
  };
}

/**
 * Create a payout. `idempotencyKey` is sent as `X-Payout-Idempotency`, so a
 * repeat of the SAME key (a retry after a timeout, a crash between the call and
 * saving its answer) returns the original payout instead of paying twice.
 */
export async function createPayout(args: {
  fundAccountId: string;
  amountPaise: number;
  mode: PayoutMode;
  purpose: PayoutPurpose;
  reference: string;
  narration: string;
  idempotencyKey: string;
}): Promise<RazorpayPayoutSummary> {
  const accountNumber = await payoutAccountNumber();
  if (!accountNumber) {
    throw new GraphQLError('Payouts are not set up. Add the RazorpayX account number in the Tech portal.', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
  const json = await call('/payouts', {
    method: 'POST',
    idempotencyKey: args.idempotencyKey,
    body: {
      account_number: accountNumber,
      fund_account_id: args.fundAccountId,
      amount: args.amountPaise,
      currency: 'INR',
      mode: args.mode,
      purpose: args.purpose,
      // Never queue behind a low balance: a payout Finance cannot see moving is
      // a payout nobody can reason about. A short balance fails fast instead.
      queue_if_low_balance: false,
      reference_id: args.reference.slice(0, 40),
      narration: args.narration.slice(0, 30),
    },
  });
  const summary = summaryOf(json);
  if (!summary.id) throw new GraphQLError('RazorpayX did not return a payout id.', { extensions: { code: 'BAD_GATEWAY' } });
  return summary;
}

/** The payout as Razorpay reports it now — the reconcile path for a missed webhook. */
export async function fetchPayout(payoutId: string): Promise<RazorpayPayoutSummary> {
  return summaryOf(await call(`/payouts/${encodeURIComponent(payoutId)}`, { method: 'GET' }));
}

// --- Webhook verification ----------------------------------------------------

/**
 * Every webhook secret saved on an active Razorpay entry in the Tech portal,
 * plus the default one. A payout event is signed with the secret of the
 * webhook that carries it, so any of them may be the right one.
 */
export async function payoutWebhookSecrets(): Promise<string[]> {
  const [fallback, entries] = await Promise.all([
    getRuntimeEnvValue('RAZORPAY_WEBHOOK_SECRET'),
    EnvEntryModel.find({ category: 'RAZORPAY', is_active: true }).select('config').lean(),
  ]);
  const fromEntries = entries.map((entry) => text((entry?.config as Record<string, unknown> | undefined)?.webhook_secret));
  return Array.from(new Set([fallback, ...fromEntries].map((secret) => secret.trim()).filter(Boolean)));
}

/** HMAC-SHA256 of the RAW body against each secret, compared in constant time. Pure. */
export function verifyPayoutWebhookSignature(rawBody: Buffer, signature: string, secrets: readonly string[]): boolean {
  const given = Buffer.from(signature || '');
  if (given.length === 0) return false;
  return secrets.some((secret) => {
    if (!secret) return false;
    const expected = Buffer.from(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
  });
}
