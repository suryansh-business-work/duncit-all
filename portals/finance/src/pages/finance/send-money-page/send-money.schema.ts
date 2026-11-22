import { z } from 'zod';
import { SEND_MONEY_CATEGORIES } from './queries';

const MAX_REASON = 300;
const MAX_NOTES = 1000;
const MAX_REFERENCE = 120;
const MIN_AMOUNT = 1;
const MIN_REASON = 3;

/** Messages arrive already translated, so the schema is a pure function of its inputs. */
export interface SendMoneyMessages {
  recipientRequired: string;
  accountRequired: string;
  amountRequired: string;
  amountPrecision: string;
  categoryRequired: string;
  reasonRequired: string;
  reasonTooLong: string;
  notesTooLong: string;
  referenceTooLong: string;
  urlInvalid: string;
}

/** More than two decimal places is not a rupee amount. */
const hasMoreThanTwoDecimals = (value: string) => /\.\d{3,}$/.test(value);

/**
 * The Send Money form. Every rule here is also enforced by the server, which is
 * the one that matters: the form only saves a round trip. The destination is
 * never a field — only the id of one of the recipient's verified accounts.
 */
export const buildSendMoneySchema = (messages: SendMoneyMessages) =>
  z
    .object({
      recipient_user_id: z.string().min(1, messages.recipientRequired),
      account_id: z.string().min(1, messages.accountRequired),
      payout_method: z.enum(['IMPS', 'NEFT']),
      amount: z.string().trim(),
      category: z.enum(SEND_MONEY_CATEGORIES, { message: messages.categoryRequired }),
      reason: z.string().trim().min(MIN_REASON, messages.reasonRequired).max(MAX_REASON, messages.reasonTooLong),
      notes: z.string().trim().max(MAX_NOTES, messages.notesTooLong),
      supporting_reference: z.string().trim().max(MAX_REFERENCE, messages.referenceTooLong),
      supporting_url: z.string().trim().refine((value) => value === '' || z.url().safeParse(value).success, messages.urlInvalid),
    })
    .superRefine((values, ctx) => {
      const amount = Number(values.amount);
      if (!values.amount || !Number.isFinite(amount) || amount < MIN_AMOUNT) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: messages.amountRequired });
      } else if (hasMoreThanTwoDecimals(values.amount)) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: messages.amountPrecision });
      }
    });

export type SendMoneyFormValues = z.infer<ReturnType<typeof buildSendMoneySchema>>;

export const EMPTY_SEND_MONEY_VALUES: SendMoneyFormValues = {
  recipient_user_id: '',
  account_id: '',
  payout_method: 'IMPS',
  amount: '',
  category: 'SALARY',
  reason: '',
  notes: '',
  supporting_reference: '',
  supporting_url: '',
};

/** The mutation input for one confirmed form. `requestId` is minted once per form so a repeat cannot send twice. */
export function toSendMoneyInput(values: SendMoneyFormValues, requestId: string) {
  return {
    request_id: requestId,
    recipient_user_id: values.recipient_user_id,
    account_id: values.account_id,
    payout_method: values.payout_method,
    amount: Number(values.amount),
    category: values.category,
    reason: values.reason,
    notes: values.notes || null,
    supporting_reference: values.supporting_reference || null,
    supporting_url: values.supporting_url || null,
  };
}
