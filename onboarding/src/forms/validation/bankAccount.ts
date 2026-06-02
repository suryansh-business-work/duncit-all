import * as yup from 'yup';

export const BANK_PAYOUT_METHODS = ['UPI', 'IMPS', 'NEFT'] as const;
export type BankPayoutMethod = (typeof BANK_PAYOUT_METHODS)[number];

export interface BankAccountValues {
  payout_method: BankPayoutMethod | '';
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
}

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_PATTERN = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{2,64}$/;
const ACCOUNT_NUMBER_PATTERN = /^\d{6,18}$/;

export const blankBankAccountValues = (): BankAccountValues => ({
  payout_method: '',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
});

const needsBankRails = (method?: string) => method === 'IMPS' || method === 'NEFT';

export const bankAccountSchema: yup.ObjectSchema<BankAccountValues> = yup.object({
  payout_method: yup
    .mixed<BankAccountValues['payout_method']>()
    .oneOf([...BANK_PAYOUT_METHODS], 'Select UPI, IMPS or NEFT')
    .required('Payout method is required'),
  account_holder_name: yup
    .string()
    .trim()
    .min(2, 'Account holder name must be at least 2 characters')
    .max(120, 'Account holder name must be 120 characters or fewer')
    .required('Account holder name is required'),
  account_number: yup.string().trim().default('').defined().when('payout_method', {
    is: needsBankRails,
    then: (schema) =>
      schema
        .matches(ACCOUNT_NUMBER_PATTERN, 'Account number must be 6 to 18 digits')
        .required('Account number is required'),
    otherwise: (schema) => schema.default(''),
  }),
  ifsc_code: yup.string().trim().uppercase().default('').defined().when('payout_method', {
    is: needsBankRails,
    then: (schema) =>
      schema
        .matches(IFSC_PATTERN, 'IFSC must use format ABCD0123456')
        .required('IFSC is required'),
    otherwise: (schema) => schema.default(''),
  }),
  upi_id: yup.string().trim().default('').defined().when('payout_method', {
    is: 'UPI',
    then: (schema) =>
      schema.matches(UPI_PATTERN, 'Enter a valid UPI ID').required('UPI ID is required'),
    otherwise: (schema) => schema.default(''),
  }),
});

export function normalizeBankAccountValues(input?: Partial<BankAccountValues> | null): BankAccountValues {
  const method = String(input?.payout_method ?? '').toUpperCase() as BankPayoutMethod;
  return {
    payout_method: BANK_PAYOUT_METHODS.includes(method) ? method : '',
    account_holder_name: String(input?.account_holder_name ?? '').trim(),
    account_number: String(input?.account_number ?? '').trim(),
    ifsc_code: String(input?.ifsc_code ?? '').trim().toUpperCase(),
    upi_id: String(input?.upi_id ?? '').trim(),
  };
}