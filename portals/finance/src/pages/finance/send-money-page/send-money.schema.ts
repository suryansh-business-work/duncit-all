import { z } from 'zod';
import { BANK_ACCOUNT_NUMBER, IFSC, UPI_ID } from '@duncit/regex';
import { SEND_MONEY_CATEGORIES } from './queries';

const MAX_REASON = 300;
const MAX_NOTES = 1000;
const MAX_REFERENCE = 120;
const MAX_HOLDER = 120;
const MIN_AMOUNT = 1;
const MIN_REASON = 3;

/** The `account_id` the form holds while Finance types an account in instead of picking a verified one. */
export const CUSTOM_ACCOUNT_ID = 'CUSTOM';

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
  upiInvalid: string;
  holderRequired: string;
  holderTooLong: string;
  accountNumberInvalid: string;
  accountNumberMismatch: string;
  ifscInvalid: string;
  acknowledgeRequired: string;
}

/** More than two decimal places is not a rupee amount. */
const hasMoreThanTwoDecimals = (value: string) => /\.\d{3,}$/.test(value);

type Issue = { path: string; message: string };

/** What is wrong with a typed account, field by field. Empty when it can be paid. Pure. */
export function customAccountIssues(values: SendMoneyFormValues, messages: SendMoneyMessages): Issue[] {
  const issues: Issue[] = [];
  if (!values.acknowledge_custom) issues.push({ path: 'acknowledge_custom', message: messages.acknowledgeRequired });
  if (values.custom_method === 'UPI') {
    if (!UPI_ID.test(values.custom_upi_id)) issues.push({ path: 'custom_upi_id', message: messages.upiInvalid });
    return issues;
  }
  if (!values.custom_holder) issues.push({ path: 'custom_holder', message: messages.holderRequired });
  else if (values.custom_holder.length > MAX_HOLDER) issues.push({ path: 'custom_holder', message: messages.holderTooLong });
  if (!BANK_ACCOUNT_NUMBER.test(values.custom_account_number)) {
    issues.push({ path: 'custom_account_number', message: messages.accountNumberInvalid });
  } else if (values.custom_account_number !== values.custom_account_number_confirm) {
    // Typed twice so a transposed digit is caught here, not in a bank statement.
    issues.push({ path: 'custom_account_number_confirm', message: messages.accountNumberMismatch });
  }
  if (!IFSC.test(values.custom_ifsc.toUpperCase())) issues.push({ path: 'custom_ifsc', message: messages.ifscInvalid });
  return issues;
}

/**
 * The Send Money form. Every rule here is also enforced by the server, which is
 * the one that matters: the form only saves a round trip. The destination is
 * either the id of one of the recipient's verified accounts, or — with
 * `account_id` set to {@link CUSTOM_ACCOUNT_ID} — an account typed in here,
 * which Finance must confirm they checked.
 */
export const buildSendMoneySchema = (messages: SendMoneyMessages) =>
  z
    .object({
      recipient_user_id: z.string().min(1, messages.recipientRequired),
      account_id: z.string().min(1, messages.accountRequired),
      payout_method: z.enum(['IMPS', 'NEFT']),
      custom_method: z.enum(['UPI', 'IMPS', 'NEFT']),
      custom_holder: z.string().trim(),
      custom_account_number: z.string().trim(),
      custom_account_number_confirm: z.string().trim(),
      custom_ifsc: z.string().trim(),
      custom_upi_id: z.string().trim(),
      acknowledge_custom: z.boolean(),
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
      if (values.account_id !== CUSTOM_ACCOUNT_ID) return;
      for (const issue of customAccountIssues(values, messages)) {
        ctx.addIssue({ code: 'custom', path: [issue.path], message: issue.message });
      }
    });

export type SendMoneyFormValues = z.infer<ReturnType<typeof buildSendMoneySchema>>;

export const EMPTY_SEND_MONEY_VALUES: SendMoneyFormValues = {
  recipient_user_id: '',
  account_id: '',
  payout_method: 'IMPS',
  custom_method: 'UPI',
  custom_holder: '',
  custom_account_number: '',
  custom_account_number_confirm: '',
  custom_ifsc: '',
  custom_upi_id: '',
  acknowledge_custom: false,
  amount: '',
  category: 'SALARY',
  reason: '',
  notes: '',
  supporting_reference: '',
  supporting_url: '',
};

/** The typed account as the server's SendMoneyCustomAccountInput: only the half its method uses. Pure. */
export function toCustomAccountInput(values: SendMoneyFormValues) {
  return values.custom_method === 'UPI'
    ? { payout_method: 'UPI' as const, upi_id: values.custom_upi_id }
    : {
        payout_method: values.custom_method,
        account_holder_name: values.custom_holder,
        account_number: values.custom_account_number,
        ifsc_code: values.custom_ifsc.toUpperCase(),
      };
}

/** The mutation input for one confirmed form. `requestId` is minted once per form so a repeat cannot send twice. */
export function toSendMoneyInput(values: SendMoneyFormValues, requestId: string) {
  const custom = values.account_id === CUSTOM_ACCOUNT_ID;
  return {
    request_id: requestId,
    recipient_user_id: values.recipient_user_id,
    ...(custom
      ? { account_id: null, custom_account: toCustomAccountInput(values), acknowledge_custom_account: values.acknowledge_custom }
      : { account_id: values.account_id, payout_method: values.payout_method }),
    amount: Number(values.amount),
    category: values.category,
    reason: values.reason,
    notes: values.notes || null,
    supporting_reference: values.supporting_reference || null,
    supporting_url: values.supporting_url || null,
  };
}
