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
 * Money only ever goes to one of these, or (for a withdrawal) to the account
 * the person asked for after Finance explicitly acknowledged it is not on file.
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
