import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';
import type { ExpenseFormValues, ExpenseInput, ExpenseRecord } from './expense.types';

/**
 * Validation for one ledger expense.
 *
 * The compensated amount is checked against the expense amount here as well as
 * on the server, because it is the one number a person can get wrong in a way
 * that changes the expense's STATE: over-compensating flips the row to "Fully
 * compensated" and takes it out of the queue somebody is working through.
 *
 * Related From is optional on purpose — a software subscription is not spent
 * on a pod, a club or a venue, and forcing a relation would only teach people
 * to pick a wrong one.
 */
export const expenseSchema = (t: Translate = fallbackT) =>
  z
    .object({
      date: z.date({ error: t('finance.expenseManagement.pickASpendDate') }),
      category: z.string().min(1, t('finance.expenseManagement.pickACategory')),
      amount: z
        .string()
        .trim()
        .refine((raw) => Number(raw) > 0, t('finance.expenseManagement.enterAnAmountGreaterThan0')),
      vendor_name: z.string().trim().max(200, t('finance.expenseManagement.tooLong')).default(''),
      payment_method: z.string().min(1, t('finance.expenseManagement.pickAPaymentMethod')),
      reference: z.string().trim().max(200, t('finance.expenseManagement.tooLong')).default(''),
      description: z.string().trim().max(1000, t('finance.expenseManagement.tooLong')).default(''),
      attachment_url: z.string().trim().max(2048, t('finance.expenseManagement.tooLong')).default(''),
      related_from_type: z.string().trim().default(''),
      related_from_id: z.string().trim().default(''),
      paid_by: z.string().trim().max(200, t('finance.expenseManagement.tooLong')).default(''),
      compensation_method: z.string().trim().default(''),
      compensated_amount: z.string().trim().default(''),
      compensation_date: z.date().nullable().default(null),
      compensation_reference: z
        .string()
        .trim()
        .max(200, t('finance.expenseManagement.tooLong'))
        .default(''),
      compensation_rejected: z.boolean().default(false),
    })
    .refine((values) => Number(values.compensated_amount || 0) <= Number(values.amount || 0), {
      path: ['compensated_amount'],
      message: t('finance.expenseManagement.compensationOverAmount'),
    })
    .refine((values) => !values.related_from_type || !!values.related_from_id, {
      path: ['related_from_id'],
      message: t('finance.expenseManagement.pickARelatedEntity'),
    });

const BLANK: Omit<ExpenseFormValues, 'date'> = {
  category: '',
  amount: '',
  vendor_name: '',
  payment_method: '',
  reference: '',
  description: '',
  attachment_url: '',
  related_from_type: '',
  related_from_id: '',
  paid_by: '',
  compensation_method: '',
  compensated_amount: '',
  compensation_date: null,
  compensation_reference: '',
  compensation_rejected: false,
};

/**
 * A saved expense back to editable values; a new one starts on today.
 *
 * Category and payment method start EMPTY rather than on a guess: both lists
 * are configured, so this file cannot know which key is a sensible default —
 * and a silent default is how every expense ends up filed under whatever the
 * first row happens to be.
 */
export function toFormValues(expense: ExpenseRecord | null): ExpenseFormValues {
  if (!expense) return { ...BLANK, date: new Date() };
  return {
    date: new Date(expense.date),
    category: expense.category,
    amount: String(expense.amount),
    vendor_name: expense.vendor_name,
    payment_method: expense.payment_method,
    reference: expense.reference,
    description: expense.description,
    attachment_url: expense.attachment_url,
    related_from_type: expense.related_from_type,
    related_from_id: expense.related_from_id ?? '',
    paid_by: expense.paid_by,
    compensation_method: expense.compensation_method,
    compensated_amount: expense.compensated_amount ? String(expense.compensated_amount) : '',
    compensation_date: expense.compensation_date ? new Date(expense.compensation_date) : null,
    compensation_reference: expense.compensation_reference,
    compensation_rejected: expense.compensation_status === 'REJECTED',
  };
}

export function toExpenseInput(values: ExpenseFormValues): ExpenseInput {
  return {
    date: values.date.toISOString(),
    category: values.category,
    amount: Number(values.amount),
    vendor_name: values.vendor_name,
    payment_method: values.payment_method,
    reference: values.reference,
    description: values.description,
    attachment_url: values.attachment_url,
    related_from_type: values.related_from_type,
    related_from_id: values.related_from_id || null,
    paid_by: values.paid_by,
    compensation_method: values.compensation_method,
    compensated_amount: Number(values.compensated_amount || 0),
    compensation_date: values.compensation_date?.toISOString() ?? null,
    compensation_reference: values.compensation_reference,
    compensation_rejected: values.compensation_rejected,
  };
}
