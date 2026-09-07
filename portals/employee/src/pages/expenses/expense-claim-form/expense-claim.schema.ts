import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';
import type { EmployeeExpenseClaim, EmployeeExpenseInput } from '@duncit/utils';
import type { ExpenseClaimFormValues } from './expense-claim.types';

/**
 * Validation for one expense claim.
 *
 * The bill is deliberately NOT required: a receipt is often photographed later
 * the same day, and blocking the claim on it would only push people to file
 * nothing. Finance sees "Not attached" on the row instead, which is the signal
 * to chase it before deciding.
 */
export const expenseClaimSchema = (t: Translate = fallbackT) =>
  z.object({
    date: z.date({ error: t('employeeExpense.form.pickASpendDate') }),
    category: z.string().min(1, t('employeeExpense.form.pickACategory')),
    amount: z
      .string()
      .trim()
      .refine((raw) => Number(raw) > 0, t('employeeExpense.form.enterAnAmountGreaterThan0')),
    merchant: z.string().trim().max(200, t('employeeExpense.form.tooLong')).default(''),
    payment_method: z.string().min(1, t('employeeExpense.form.pickAPaymentMethod')),
    bill_number: z.string().trim().max(120, t('employeeExpense.form.tooLong')).default(''),
    bill_url: z.string().trim().max(2048, t('employeeExpense.form.tooLong')).default(''),
    reference: z.string().trim().max(200, t('employeeExpense.form.tooLong')).default(''),
    description: z.string().trim().max(1000, t('employeeExpense.form.tooLong')).default(''),
  });

const BLANK: Omit<ExpenseClaimFormValues, 'date'> = {
  category: 'TRAVEL',
  amount: '',
  merchant: '',
  payment_method: 'UPI',
  bill_number: '',
  bill_url: '',
  reference: '',
  description: '',
};

/** A saved claim back to editable values; a new claim starts on today. */
export function toFormValues(claim: EmployeeExpenseClaim | null): ExpenseClaimFormValues {
  if (!claim) return { ...BLANK, date: new Date() };
  return {
    date: new Date(claim.date),
    category: claim.category,
    amount: String(claim.amount),
    merchant: claim.merchant,
    payment_method: claim.payment_method,
    bill_number: claim.bill_number,
    bill_url: claim.bill_url,
    reference: claim.reference,
    description: claim.description,
  };
}

export function toExpenseClaimInput(values: ExpenseClaimFormValues): EmployeeExpenseInput {
  return { ...values, date: values.date.toISOString(), amount: Number(values.amount) };
}
