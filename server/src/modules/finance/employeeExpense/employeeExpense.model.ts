import { Schema, model, Types, type Document } from 'mongoose';
import { EXPENSE_PAYMENT_METHODS, type ExpensePaymentMethod } from '@modules/finance/expense/expense.model';

/**
 * What ONE employee paid out of pocket and is claiming back from Duncit.
 *
 * A separate collection from `Expense` (the company ledger) and from
 * `PodExpense` (what a pod cost): those two are money Duncit has already spent
 * and recorded, while this one is a CLAIM — it is filed by the person, it is
 * worth nothing until Finance decides on it, and the decision is the record
 * that matters. Folding it into the ledger would mean an expense row that is
 * sometimes not an expense.
 *
 * The payment methods are the company ledger's — one list of ways money moves,
 * not two that drift (rule 34).
 */
export const EMPLOYEE_EXPENSE_CATEGORIES = [
  'TRAVEL',
  'FUEL',
  'MEALS',
  'ACCOMMODATION',
  'OFFICE_SUPPLIES',
  'SOFTWARE',
  'INTERNET',
  'PHONE',
  'TRAINING',
  'CLIENT_ENTERTAINMENT',
  'MEDICAL',
  'OTHER',
] as const;
export type EmployeeExpenseCategory = (typeof EMPLOYEE_EXPENSE_CATEGORIES)[number];

/**
 * A claim's whole life. There is no DRAFT: an unfiled claim is a form the
 * employee has not submitted, not a row. There is no PAID either — the money
 * leaves through the company ledger, and a second "paid" flag here would be a
 * number Finance has to keep true in two places.
 */
export const EMPLOYEE_EXPENSE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type EmployeeExpenseStatus = (typeof EMPLOYEE_EXPENSE_STATUSES)[number];

export { EXPENSE_PAYMENT_METHODS as EMPLOYEE_EXPENSE_PAYMENT_METHODS };

export interface IEmployeeExpense extends Document {
  /** Narrowed from Document's `unknown`: every read of this doc stringifies it. */
  _id: Types.ObjectId;
  /** Human-readable claim reference, e.g. `DUN-EXP-4F2A19`. */
  claim_id: string;
  employee_id: Types.ObjectId;
  date: Date;
  category: EmployeeExpenseCategory;
  amount: number;
  description: string;
  merchant: string;
  payment_method: ExpensePaymentMethod;
  reference: string;
  /** Supplier's bill / invoice number, as printed on the document. */
  bill_number: string;
  /** The uploaded bill or receipt itself (image or PDF). '' = not attached yet. */
  bill_url: string;
  status: EmployeeExpenseStatus;
  reviewed_by: Types.ObjectId | null;
  reviewed_at: Date | null;
  /** Finance's note on the decision — the reason a rejection gives back. */
  review_note: string;
  created_at: Date;
  updated_at: Date;
}

const employeeExpenseSchema = new Schema<IEmployeeExpense>(
  {
    claim_id: { type: String, required: true, unique: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true },
    category: { type: String, enum: EMPLOYEE_EXPENSE_CATEGORIES, default: 'OTHER', index: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    merchant: { type: String, default: '', trim: true, maxlength: 200 },
    payment_method: { type: String, enum: EXPENSE_PAYMENT_METHODS, default: 'UPI' },
    reference: { type: String, default: '', trim: true, maxlength: 200 },
    bill_number: { type: String, default: '', trim: true, maxlength: 120 },
    bill_url: { type: String, default: '', trim: true },
    status: { type: String, enum: EMPLOYEE_EXPENSE_STATUSES, default: 'PENDING', index: true },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
    review_note: { type: String, default: '', trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The employee's own list reads their claims newest-first.
employeeExpenseSchema.index({ employee_id: 1, date: -1 });
// Finance lands on the pending queue, oldest claim first.
employeeExpenseSchema.index({ status: 1, created_at: 1 });

export const EmployeeExpenseModel = model<IEmployeeExpense>(
  'EmployeeExpense',
  employeeExpenseSchema
);
