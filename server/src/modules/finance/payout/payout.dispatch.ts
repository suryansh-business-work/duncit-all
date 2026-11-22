import { GraphQLError } from 'graphql';
import { IFSC_PATTERN, UPI_ID_PATTERN } from '@utils/field-formats';
import {
  createContact,
  createFundAccount,
  createPayout,
  isPayoutConfigured,
  payoutOutcomeOf,
  type PayoutDestination,
  type PayoutMode,
  type PayoutPurpose,
  type RazorpayPayoutSummary,
} from './razorpayX.gateway';

/**
 * One attempt at sending money, with no database in it.
 *
 * The caller has ALREADY claimed the record (atomically moved it to PROCESSING
 * under this attempt's idempotency key) before it gets here, which is what stops
 * two clicks, two tabs or a retried request from sending twice. This function
 * only talks to RazorpayX and classifies what came back — it never decides that
 * money is paid; `PAID` is only ever what Razorpay itself reports.
 *
 * The distinction that matters is DEFINITELY-NOT-SENT versus UNKNOWN:
 *   - a refusal before the payout request, or a 4xx to it, means nothing was
 *     sent → FAILED, safe to retry as a fresh attempt;
 *   - a timeout, a dropped connection or a 5xx to the payout request may mean
 *     Razorpay DID take it → UNKNOWN. The record stays PROCESSING and a resend
 *     with the SAME idempotency key returns the original payout, never a second.
 */

export const toPaise = (rupees: number): number => Math.round((Number(rupees) || 0) * 100);

export interface PayoutPayee {
  name: string;
  email: string;
  method: PayoutMode;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
}

/** The destination, or a field-level reason it cannot be paid. Pure. */
export function destinationOf(payee: PayoutPayee): PayoutDestination {
  const holder = payee.account_holder_name.trim() || payee.name.trim();
  if (payee.method === 'UPI') {
    const upi = payee.upi_id.trim();
    if (!UPI_ID_PATTERN.test(upi)) {
      throw new GraphQLError('The UPI ID on this account is not valid.', {
        extensions: { code: 'BAD_USER_INPUT', field: 'upi_id' },
      });
    }
    return { kind: 'UPI', name: holder, upi_id: upi };
  }
  const account = payee.account_number.trim();
  const ifsc = payee.ifsc_code.trim().toUpperCase();
  if (!/^\d{6,18}$/.test(account)) {
    throw new GraphQLError('The bank account number on this account is not valid.', {
      extensions: { code: 'BAD_USER_INPUT', field: 'account_number' },
    });
  }
  if (!IFSC_PATTERN.test(ifsc)) {
    throw new GraphQLError('The IFSC code on this account is not valid.', {
      extensions: { code: 'BAD_USER_INPUT', field: 'ifsc_code' },
    });
  }
  if (!holder) {
    throw new GraphQLError('The account holder name is missing.', {
      extensions: { code: 'BAD_USER_INPUT', field: 'account_holder_name' },
    });
  }
  return { kind: 'BANK', name: holder, account_number: account, ifsc };
}

/** Refuse before anything is claimed, when payouts cannot run at all. */
export async function assertPayoutsConfigured(): Promise<void> {
  if (await isPayoutConfigured()) return;
  throw new GraphQLError(
    'Payouts are not set up. Add the Razorpay keys and the RazorpayX account number in the Tech portal.',
    { extensions: { code: 'BAD_REQUEST' } }
  );
}

export interface ExecuteArgs {
  payee: PayoutPayee;
  amount: number;
  purpose: PayoutPurpose;
  /** Our record's id — Razorpay `reference_id`, so a payout can be traced back. */
  reference: string;
  narration: string;
  idempotencyKey: string;
  /** Ids a previous attempt already created; reused so a retry does not pile up contacts. */
  known?: { contact_id?: string; fund_account_id?: string };
}

export type ExecuteResult =
  | {
      outcome: 'PROCESSING' | 'PAID' | 'FAILED';
      contact_id: string;
      fund_account_id: string;
      payout: RazorpayPayoutSummary | null;
      failure_reason: string;
    }
  | { outcome: 'UNKNOWN'; contact_id: string; fund_account_id: string; payout: null; failure_reason: string };

const messageOf = (error: unknown): string =>
  (error instanceof Error ? error.message : 'The payout could not be sent.').slice(0, 500);

/** True when Razorpay answered with a definite refusal (nothing was created). */
const isDefiniteRefusal = (error: unknown): boolean => {
  const status = (error as { extensions?: { razorpay_status?: number } } | null)?.extensions?.razorpay_status;
  return typeof status === 'number' && status >= 400 && status < 500;
};

export async function executePayout(args: ExecuteArgs): Promise<ExecuteResult> {
  const destination = destinationOf(args.payee);
  let contactId = args.known?.contact_id ?? '';
  let fundAccountId = args.known?.fund_account_id ?? '';
  try {
    if (!fundAccountId) {
      contactId ||= await createContact({ name: args.payee.name, email: args.payee.email, reference: args.reference });
      fundAccountId = await createFundAccount(contactId, destination);
    }
  } catch (error) {
    // Nothing has been sent yet whatever went wrong here, so this is a clean failure.
    return { outcome: 'FAILED', contact_id: contactId, fund_account_id: fundAccountId, payout: null, failure_reason: messageOf(error) };
  }
  try {
    const payout = await createPayout({
      fundAccountId,
      amountPaise: toPaise(args.amount),
      mode: args.payee.method,
      purpose: args.purpose,
      reference: args.reference,
      narration: args.narration,
      idempotencyKey: args.idempotencyKey,
    });
    const outcome = payoutOutcomeOf(payout.status);
    return {
      outcome,
      contact_id: contactId,
      fund_account_id: fundAccountId,
      payout,
      failure_reason: outcome === 'FAILED' ? payout.failure_reason || `Razorpay reported the payout as ${payout.status}.` : '',
    };
  } catch (error) {
    if (isDefiniteRefusal(error)) {
      return { outcome: 'FAILED', contact_id: contactId, fund_account_id: fundAccountId, payout: null, failure_reason: messageOf(error) };
    }
    return { outcome: 'UNKNOWN', contact_id: contactId, fund_account_id: fundAccountId, payout: null, failure_reason: messageOf(error) };
  }
}

/** `<record id>:<attempt>` — the same key for a resend, a new one for a deliberate retry. */
export const idempotencyKeyFor = (recordId: string, attempt: number): string => `${recordId}:${attempt}`;
