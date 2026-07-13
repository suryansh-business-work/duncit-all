import { z } from 'zod';
import {
  BANK_PAYOUT_METHODS,
  blankBankAccountValues,
  type BankAccountValues,
} from '../validation/bankAccount';

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_PATTERN = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{2,64}$/;
const ACCOUNT_NUMBER_PATTERN = /^\d{6,18}$/;

const needsBankRails = (method?: string) => method === 'IMPS' || method === 'NEFT';

const PAYOUT_METHOD_SET = new Set<string>(BANK_PAYOUT_METHODS);

interface BankAccountShape {
  payout_method: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
}

function checkPayoutMethod(value: BankAccountShape, ctx: z.RefinementCtx) {
  if (PAYOUT_METHOD_SET.has(value.payout_method)) return;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['payout_method'],
    message: 'Select UPI, IMPS or NEFT',
  });
}

function checkAccountHolderName(value: BankAccountShape, ctx: z.RefinementCtx) {
  const name = value.account_holder_name;
  if (name.length >= 2 && name.length <= 120) return;
  const shortMessage =
    name.length === 0 ? 'Account holder name is required' : 'Account holder name must be at least 2 characters';
  const message = name.length < 2 ? shortMessage : 'Account holder name must be 120 characters or fewer';
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['account_holder_name'],
    message,
  });
}

function checkBankRails(value: BankAccountShape, ctx: z.RefinementCtx) {
  if (!needsBankRails(value.payout_method)) return;
  if (!ACCOUNT_NUMBER_PATTERN.test(value.account_number)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['account_number'],
      message:
        value.account_number.length === 0
          ? 'Account number is required'
          : 'Account number must be 6 to 18 digits',
    });
  }
  if (!IFSC_PATTERN.test(value.ifsc_code)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ifsc_code'],
      message: value.ifsc_code.length === 0 ? 'IFSC is required' : 'IFSC must use format ABCD0123456',
    });
  }
}

function checkUpi(value: BankAccountShape, ctx: z.RefinementCtx) {
  if (value.payout_method !== 'UPI' || UPI_PATTERN.test(value.upi_id)) return;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['upi_id'],
    message: value.upi_id.length === 0 ? 'UPI ID is required' : 'Enter a valid UPI ID',
  });
}

/**
 * Zod mirror of the shared yup `bankAccountSchema`, scoped to the host form's
 * RHF migration. The shared yup version stays in place for the venue/login
 * forms; this keeps the validation rules and messages byte-for-byte identical.
 */
export const hostBankAccountSchema = z
  .object({
    payout_method: z.string().trim(),
    account_holder_name: z.string().trim(),
    account_number: z.string().trim().default(''),
    ifsc_code: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .default(''),
    upi_id: z.string().trim().default(''),
  })
  .superRefine((value, ctx) => {
    checkPayoutMethod(value, ctx);
    checkAccountHolderName(value, ctx);
    checkBankRails(value, ctx);
    checkUpi(value, ctx);
  });

/** Cast helper so variable mappers emit the same trimmed/upper-cased shape. */
export function castHostBankAccount(value: BankAccountValues): BankAccountValues {
  const parsed = hostBankAccountSchema.safeParse(value);
  const data = parsed.success ? parsed.data : blankBankAccountValues();
  return {
    payout_method: data.payout_method as BankAccountValues['payout_method'],
    account_holder_name: data.account_holder_name,
    account_number: data.account_number,
    ifsc_code: data.ifsc_code,
    upi_id: data.upi_id,
  };
}
