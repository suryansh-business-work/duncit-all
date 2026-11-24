import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { normalizeBankAccountInput, type BankPayoutMethod } from '@modules/finance/finance/bankAccount';
import type { AccountSource } from './payout.model';

/**
 * The bank accounts Duncit has VERIFIED for a person.
 *
 * An account counts as verified when it sits on a record Duncit approved — an
 * approved host, venue or e-commerce brand — because approval is where the
 * details were checked. A withdrawal request or a Send Money form never makes
 * an account verified by being typed into it.
 *
 * Money only ever goes to one of these, or to an account Finance explicitly
 * acknowledged is not on file: the one a withdrawal asked for, or one typed into
 * Send Money ({@link customAccount}).
 */
export interface VerifiedAccount {
  /** `<source>:<record id>` — what a form sends back to pick this account. */
  id: string;
  source: AccountSource;
  /** What the account belongs to — the venue or brand name, or the host's name. */
  label: string;
  payout_method: BankPayoutMethod;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
}

interface Bankish {
  payout_method?: string;
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
}

/** A record's bank block as a verified account, or null when it names no destination. Pure. */
export function toVerifiedAccount(
  source: AccountSource,
  recordId: unknown,
  label: string,
  raw: Bankish | null | undefined
): VerifiedAccount | null {
  const bank = normalizeBankAccountInput(raw ?? {});
  if (!bank.payout_method) return null;
  const hasDestination = bank.payout_method === 'UPI' ? !!bank.upi_id : !!(bank.account_number && bank.ifsc_code);
  if (!hasDestination) return null;
  return { id: `${source}:${String(recordId)}`, source, label, ...bank, payout_method: bank.payout_method };
}

/** Every verified account the person has, one per approved record. */
export async function verifiedAccountsFor(userId: string): Promise<VerifiedAccount[]> {
  if (!Types.ObjectId.isValid(userId)) return [];
  const id = new Types.ObjectId(userId);
  const [hosts, venues, brands] = await Promise.all([
    HostModel.find({ user_id: id, status: 'APPROVED' }).select('full_name bank_account').lean(),
    VenueModel.find({ owner_user_id: id, status: 'APPROVED' }).select('venue_name bank_account').lean(),
    EcommBrandModel.find({ owner_user_id: id, status: 'APPROVED' })
      .select('brand_name account_holder_name account_number ifsc_code upi_id')
      .lean(),
  ]);
  return [
    ...hosts.map((h) => toVerifiedAccount('HOST', h._id, h.full_name ?? '', h.bank_account)),
    ...venues.map((v) => toVerifiedAccount('VENUE', v._id, v.venue_name ?? '', v.bank_account)),
    // A brand keeps its payout details flat, with no method of its own: a UPI id
    // alone means UPI, otherwise the bank account is paid by IMPS.
    ...brands.map((b) =>
      toVerifiedAccount('ECOMM_BRAND', b._id, b.brand_name ?? '', {
        payout_method: b.account_number && b.ifsc_code ? 'IMPS' : 'UPI',
        account_holder_name: b.account_holder_name,
        account_number: b.account_number,
        ifsc_code: b.ifsc_code,
        upi_id: b.upi_id,
      })
    ),
  ].filter((account): account is VerifiedAccount => account !== null);
}

/** Bank details Finance typed into Send Money for one transfer. */
export interface CustomAccountInput {
  payout_method?: string | null;
  account_holder_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  upi_id?: string | null;
}

/** Longest holder name the venue and host editors accept, and so the longest Razorpay is sent. */
const HOLDER_NAME_MAX = 120;

const customAccountError = (message: string, field: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', field: `custom_account.${field}` } });

/**
 * An account Finance typed in for ONE transfer, as a destination. Pure.
 *
 * It is never saved as verified anywhere: it lives only on the transfer it pays,
 * marked CUSTOM. A UPI destination keeps only the UPI ID and a bank one only the
 * holder, number and IFSC, so a stray value in the other half cannot ride along.
 * The formats themselves are checked by `destinationOf` when the payee is built,
 * which is the same check every other payout passes.
 */
export function customAccount(raw: CustomAccountInput): VerifiedAccount {
  const bank = normalizeBankAccountInput(raw);
  if (!bank.payout_method) throw customAccountError('Choose UPI, IMPS or NEFT for the account.', 'payout_method');
  if (bank.account_holder_name.length > HOLDER_NAME_MAX) {
    throw customAccountError(`Keep the account holder name under ${HOLDER_NAME_MAX} characters.`, 'account_holder_name');
  }
  const isUpi = bank.payout_method === 'UPI';
  if (!isUpi && !bank.account_holder_name) {
    throw customAccountError('Enter the account holder name as the bank has it.', 'account_holder_name');
  }
  return {
    id: 'CUSTOM',
    source: 'CUSTOM',
    label: '',
    payout_method: bank.payout_method,
    account_holder_name: bank.account_holder_name,
    account_number: isUpi ? '' : bank.account_number,
    ifsc_code: isUpi ? '' : bank.ifsc_code,
    upi_id: isUpi ? bank.upi_id : '',
  };
}

/** The destination as one comparable string — number+IFSC for a bank, the address for UPI. Pure. */
const destinationKey = (bank: Bankish): string => {
  const b = normalizeBankAccountInput(bank);
  return b.payout_method === 'UPI' ? `upi:${b.upi_id.toLowerCase()}` : `bank:${b.account_number}:${b.ifsc_code}`;
};

/**
 * The verified account that IS this destination, or null. Compared on the
 * destination itself, not on the payout method: a host who verified a bank
 * account and then asks for NEFT instead of IMPS is still paying their own account.
 */
export function matchVerified(accounts: readonly VerifiedAccount[], destination: Bankish): VerifiedAccount | null {
  const wanted = normalizeBankAccountInput(destination);
  const isUpi = wanted.payout_method === 'UPI';
  return (
    accounts.find((account) =>
      isUpi === (account.payout_method === 'UPI')
        ? destinationKey({ ...account, payout_method: isUpi ? 'UPI' : 'IMPS' }) ===
          destinationKey({ ...wanted, payout_method: isUpi ? 'UPI' : 'IMPS' })
        : false
    ) ?? null
  );
}
