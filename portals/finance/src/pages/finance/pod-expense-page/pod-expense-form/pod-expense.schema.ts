import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';
import type { PodExpenseFormValues, PodExpenseInput } from './pod-expense.types';
import type { PodExpenseRow } from '../queries';

/**
 * Validation for one pod expense.
 *
 * The bill is deliberately NOT required: a spend often has to be recorded on
 * the day it happens and the supplier's invoice arrives later. The list marks
 * the entry as missing its bill instead, and the "Bill missing" tab is how
 * Finance chases it — a hard requirement here would just push people to type a
 * placeholder.
 */
export const podExpenseSchema = (t: Translate = fallbackT) =>
  z.object({
    date: z.date({
      required_error: t('finance.podExpense.pickASpendDate'),
      invalid_type_error: t('finance.podExpense.pickASpendDate'),
    }),
    category: z.string().min(1, t('finance.podExpense.pickACategory')),
    amount: z
      .number({ invalid_type_error: t('finance.expenseManagement.enterAnAmountGreaterThan0') })
      .positive(t('finance.expenseManagement.enterAnAmountGreaterThan0')),
    vendor_name: z.string().trim().max(200, t('finance.podExpense.tooLong')).default(''),
    payment_method: z.string().min(1, t('finance.podExpense.pickAPaymentMethod')),
    bill_number: z.string().trim().max(120, t('finance.podExpense.tooLong')).default(''),
    bill_url: z.string().trim().max(2048, t('finance.podExpense.tooLong')).default(''),
    reference: z.string().trim().max(200, t('finance.podExpense.tooLong')).default(''),
    description: z.string().trim().max(1000, t('finance.podExpense.tooLong')).default(''),
  });

const BLANK: Omit<PodExpenseFormValues, 'date'> = {
  category: 'VENUE_RENT',
  amount: Number.NaN,
  vendor_name: '',
  payment_method: 'BANK_TRANSFER',
  bill_number: '',
  bill_url: '',
  reference: '',
  description: '',
};

/** A saved row back to editable values; a new entry starts on today. */
export function toFormValues(expense: PodExpenseRow | null): PodExpenseFormValues {
  if (!expense) return { ...BLANK, date: new Date() };
  return {
    date: new Date(expense.date),
    category: expense.category,
    amount: expense.amount,
    vendor_name: expense.vendor_name,
    payment_method: expense.payment_method,
    bill_number: expense.bill_number,
    bill_url: expense.bill_url,
    reference: expense.reference,
    description: expense.description,
  };
}

export function toPodExpenseInput(values: PodExpenseFormValues): PodExpenseInput {
  return { ...values, date: values.date.toISOString(), amount: Number(values.amount) };
}
