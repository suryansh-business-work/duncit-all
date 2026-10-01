import { z } from 'zod';

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

export const bankAccountSchema: z.ZodType<BankAccountValues> = z
  .object({
    payout_method: z.enum(BANK_PAYOUT_METHODS, {
      error: (issue) => (issue.input == null ? 'Payout method is required' : 'Select UPI, IMPS or NEFT'),
    }),
    account_holder_name: z
      .string({ error: 'Account holder name is required' })
      .trim()
      .min(2, 'Account holder name must be at least 2 characters')
      .max(120, 'Account holder name must be 120 characters or fewer'),
    account_number: z.string().trim().default(''),
    ifsc_code: z.string().trim().toUpperCase().default(''),
    upi_id: z.string().trim().default(''),
  })
  // Which details are checked depends on the payout method; the rest are left alone.
  .superRefine((values, ctx) => {
    const check = (field: 'account_number' | 'ifsc_code' | 'upi_id', pattern: RegExp, invalid: string, required: string) => {
      if (!pattern.test(values[field])) ctx.addIssue({ code: 'custom', path: [field], message: invalid });
      if (!values[field]) ctx.addIssue({ code: 'custom', path: [field], message: required });
    };
    if (needsBankRails(values.payout_method)) {
      check('account_number', ACCOUNT_NUMBER_PATTERN, 'Account number must be 6 to 18 digits', 'Account number is required');
      check('ifsc_code', IFSC_PATTERN, 'IFSC must use format ABCD0123456', 'IFSC is required');
    }
    if (values.payout_method === 'UPI') check('upi_id', UPI_PATTERN, 'Enter a valid UPI ID', 'UPI ID is required');
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