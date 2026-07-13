import { Schema } from 'mongoose';

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

const clean = (value?: string | null) => String(value ?? '').trim();

export function normalizeBankAccountInput(input: any): IBankAccountVerification {
  const method = clean(input?.payout_method).toUpperCase() as BankPayoutMethod;
  return {
    payout_method: BANK_PAYOUT_METHODS.includes(method) ? method : '',
    account_holder_name: clean(input?.account_holder_name),
    account_number: clean(input?.account_number),
    ifsc_code: clean(input?.ifsc_code).toUpperCase(),
    upi_id: clean(input?.upi_id),
  };
}

export function toBankAccountPub(value?: Partial<IBankAccountVerification> | null) {
  const bankAccount = normalizeBankAccountInput(value ?? {});
  return {
    ...bankAccount,
    payout_method: bankAccount.payout_method || null,
  };
}