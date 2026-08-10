import { EM_DASH } from '@duncit/table';
import type { WithdrawalRow } from './queries';

const VISIBLE_TAIL = 4;
const MASK = '••••';

/**
 * Bank account numbers are never shown whole in a list: the last four digits are
 * what a reviewer matches against the beneficiary's own statement, and the rest
 * is a liability sitting on a shared screen.
 */
export function maskAccountNumber(accountNumber: string): string {
  const value = accountNumber.trim();
  if (value.length <= VISIBLE_TAIL) return value;
  return `${MASK}${value.slice(-VISIBLE_TAIL)}`;
}

/**
 * The one identifier that actually pays this withdrawal: the UPI handle for UPI,
 * the masked account + IFSC for a bank transfer. Never the raw record.
 */
export function accountDetails(row: WithdrawalRow): string {
  if (row.payout_method === 'UPI') return row.upi_id || EM_DASH;
  const account = maskAccountNumber(row.account_number);
  const ifsc = row.ifsc_code.trim();
  if (!account && !ifsc) return EM_DASH;
  if (!ifsc) return account;
  if (!account) return ifsc;
  return `${account} · ${ifsc}`;
}

/**
 * The UNMASKED destination, for the Mark Paid confirmation only.
 *
 * The operator confirming a payment has to have already sent the money, so they
 * need the whole account number — a masked list is a sensible default, a masked
 * payment instruction is just unusable. Deliberately not exported to the table.
 */
export function payoutTarget(row: WithdrawalRow): string {
  if (row.payout_method === 'UPI') return row.upi_id || EM_DASH;
  const parts = [row.account_holder_name, row.account_number, row.ifsc_code]
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : EM_DASH;
}

/** The name the money lands on, which can differ from the requesting member. */
export function accountHolder(row: WithdrawalRow): string {
  if (row.payout_method === 'UPI') return '';
  return row.account_holder_name.trim();
}
