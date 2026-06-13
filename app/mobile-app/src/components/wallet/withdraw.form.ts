import { z } from 'zod';

import { WithdrawalMethod, type RequestWithdrawalInput } from '@/generated/graphql/graphql';

export type WithdrawMethod = 'UPI' | 'IMPS' | 'NEFT';

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

const METHOD: Record<WithdrawMethod, WithdrawalMethod> = {
  UPI: WithdrawalMethod.Upi,
  IMPS: WithdrawalMethod.Imps,
  NEFT: WithdrawalMethod.Neft,
};

/** Withdrawal schema — amount must be within the wallet balance, and the right
 * payout details are required for the chosen method. */
export const buildWithdrawSchema = (max: number) =>
  z
    .object({
      amount: z
        .string()
        .refine((v) => Number(v) > 0, 'Enter an amount')
        .refine((v) => Number(v) <= max, `Max ${max}`),
      payout_method: z.enum(['UPI', 'IMPS', 'NEFT']),
      upi_id: z.string().trim(),
      account_holder_name: z.string().trim(),
      account_number: z.string().trim(),
      ifsc_code: z.string().trim(),
    })
    .superRefine((v, ctx) => {
      if (v.payout_method === 'UPI') {
        if (!v.upi_id)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['upi_id'],
            message: 'Enter your UPI ID',
          });
        return;
      }
      if (!v.account_number)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['account_number'],
          message: 'Enter account number',
        });
      if (!v.ifsc_code)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ifsc_code'],
          message: 'Enter IFSC code',
        });
    });

/** Maps the validated values onto the server's RequestWithdrawalInput. */
export function buildWithdrawInput(values: WithdrawValues): RequestWithdrawalInput {
  return {
    amount: Number(values.amount),
    payout_method: METHOD[values.payout_method],
    upi_id: values.upi_id.trim() || undefined,
    account_holder_name: values.account_holder_name.trim() || undefined,
    account_number: values.account_number.trim() || undefined,
    ifsc_code: values.ifsc_code.trim() || undefined,
  };
}
