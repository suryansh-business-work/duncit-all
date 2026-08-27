import { z } from 'zod';

import type { Translate } from './translate';

/** How a payout leaves the wallet. The values are the server enum's members. */
export type WithdrawMethod = 'UPI' | 'IMPS' | 'NEFT';

/** Every payout method, in the order the picker lists them. */
export const WITHDRAW_METHODS: readonly WithdrawMethod[] = ['UPI', 'IMPS', 'NEFT'];

/** The withdrawal form's own state — strings, because the amount box is one. */
export interface WithdrawValues {
  amount: string;
  payout_method: WithdrawMethod;
  upi_id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
}

export const blankWithdrawValues: WithdrawValues = {
  amount: '',
  payout_method: 'UPI',
  upi_id: '',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
};

/**
 * The withdrawal contract every wallet uses.
 *
 * @param max The wallet balance — nobody may withdraw more than they hold.
 * @param min The role-wise floor from Finance → Withdrawals. The server enforces
 *   TWO rules (balance ≥ min AND amount ≥ min); validating only the balance let
 *   someone with a healthy balance submit an under-floor amount and meet a raw
 *   server error instead of a field message. 0 disables the floor.
 * @param t The reader's translator — the messages are copy (rule 38). The
 *   partner console's amount rules were hard-coded English before this moved.
 */
export function makeWithdrawSchema(max: number, min: number, t: Translate) {
  return z
    .object({
      amount: z
        .string()
        .refine((v) => Number(v) > 0, t('withdraw.enterAnAmount'))
        .refine((v) => Number(v) <= max, t('withdraw.maxAmount', { vars: { max } }))
        .refine((v) => min <= 0 || Number(v) >= min, t('withdraw.minimumAmount', { vars: { min } })),
      payout_method: z.enum(['UPI', 'IMPS', 'NEFT']),
      upi_id: z.string().trim(),
      account_holder_name: z.string().trim(),
      account_number: z.string().trim(),
      ifsc_code: z.string().trim(),
    })
    // Which payout details are required depends on the method, so it is a
    // superRefine rather than a discriminated union: react-hook-form keeps one
    // set of registered fields while the reader switches the picker.
    .superRefine((v, ctx) => {
      if (v.payout_method === 'UPI') {
        if (!v.upi_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['upi_id'],
            message: t('withdraw.enterYourUpiId'),
          });
        }
        return;
      }
      if (!v.account_number) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['account_number'],
          message: t('withdraw.enterAccountNumber'),
        });
      }
      if (!v.ifsc_code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ifsc_code'],
          message: t('withdraw.enterIfscCode'),
        });
      }
    });
}

/** The `requestWithdrawal` input — blank optional details dropped. */
export interface WithdrawInput {
  amount: number;
  payout_method: WithdrawMethod;
  upi_id?: string;
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
}

/** Maps the validated values onto the server's RequestWithdrawalInput. */
export function buildWithdrawInput(values: Readonly<WithdrawValues>): WithdrawInput {
  return {
    amount: Number(values.amount),
    payout_method: values.payout_method,
    upi_id: values.upi_id.trim() || undefined,
    account_holder_name: values.account_holder_name.trim() || undefined,
    account_number: values.account_number.trim() || undefined,
    ifsc_code: values.ifsc_code.trim() || undefined,
  };
}
