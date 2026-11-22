import { GraphQLError } from 'graphql';
import { Schema } from 'mongoose';
import { BANK_ACCOUNT_NUMBER_PATTERN, IFSC_PATTERN, UPI_ID_PATTERN } from '@utils/field-formats';

export const BANK_PAYOUT_METHODS = ['UPI', 'IMPS', 'NEFT'] as const;
export type BankPayoutMethod = (typeof BANK_PAYOUT_METHODS)[number];
export type BankPayoutMethodValue = BankPayoutMethod | '';

export interface IBankAccountVerification {
  payout_method: BankPayoutMethodValue;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
}

export const blankBankAccount = (): IBankAccountVerification => ({
  payout_method: '',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
});

export const bankAccountSchema = new Schema<IBankAccountVerification>(
  {
    payout_method: { type: String, enum: [...BANK_PAYOUT_METHODS, ''], default: '' },
    account_holder_name: { type: String, default: '' },
    account_number: { type: String, default: '' },
    ifsc_code: { type: String, default: '' },
    upi_id: { type: String, default: '' },
  },
  { _id: false }
);

/** Bank details as they arrive: from a form, an API call or a stored record. Any field may be missing. */
export type BankAccountInput = Partial<Record<keyof IBankAccountVerification, string | null>> | null | undefined;

const clean = (value?: string | null) => String(value ?? '').trim();

export function normalizeBankAccountInput(input: BankAccountInput): IBankAccountVerification {
  const method = clean(input?.payout_method).toUpperCase() as BankPayoutMethod;
  return {
    payout_method: BANK_PAYOUT_METHODS.includes(method) ? method : '',
    account_holder_name: clean(input?.account_holder_name),
    account_number: clean(input?.account_number),
    ifsc_code: clean(input?.ifsc_code).toUpperCase(),
    upi_id: clean(input?.upi_id),
  };
}

/** Most an account holder's name may run to — the venue and host editors' limit. */
const HOLDER_NAME_MAX = 120;

/**
 * Bank details as a person typed them, refused when what IS filled in is
 * malformed — the rules the owner's registration form and the staff venue and
 * host editors all apply. Nothing becomes required here: staff register a
 * venue before its bank is known and a host applies without one, so only the
 * values present are held to a format. An unknown payout method is refused
 * rather than quietly stored as none, since this is where payouts are sent.
 *
 * Writes call this; reads keep normalizeBankAccountInput, which never throws.
 * `stored` is the record's current bank: details re-sent unchanged are let
 * through as they are, so a record saved before these checks (the host editor
 * never had them) can still be edited — only new or changed details are held.
 */
export function validatedBankAccountInput(input: BankAccountInput, stored?: BankAccountInput): IBankAccountVerification {
  const method = clean(input?.payout_method).toUpperCase();
  const bank = normalizeBankAccountInput(input);
  if (stored && JSON.stringify(normalizeBankAccountInput(stored)) === JSON.stringify(bank)) return bank;
  const problems: string[] = [];
  if (method && !bank.payout_method) problems.push(`Payout method must be one of: ${BANK_PAYOUT_METHODS.join(', ')}`);
  if (bank.account_holder_name.length > HOLDER_NAME_MAX) {
    problems.push(`Account holder name must be ${HOLDER_NAME_MAX} characters or fewer`);
  }
  if (bank.account_number && !BANK_ACCOUNT_NUMBER_PATTERN.test(bank.account_number)) {
    problems.push('Account number must be 6 to 18 digits');
  }
  if (bank.ifsc_code && !IFSC_PATTERN.test(bank.ifsc_code)) problems.push('IFSC must be 11 characters, such as HDFC0001234');
  if (bank.upi_id && !UPI_ID_PATTERN.test(bank.upi_id)) problems.push('UPI ID must look like name@bank');
  if (problems.length) {
    throw new GraphQLError(problems.join('. '), { extensions: { code: 'BAD_USER_INPUT', errors: problems } });
  }
  return bank;
}

export function toBankAccountPub(value?: Partial<IBankAccountVerification> | null) {
  const bankAccount = normalizeBankAccountInput(value ?? {});
  return {
    ...bankAccount,
    payout_method: bankAccount.payout_method || null,
  };
}