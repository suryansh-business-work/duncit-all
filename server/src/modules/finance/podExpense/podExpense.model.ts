import { Schema, model, Types, type Document } from 'mongoose';
import { EXPENSE_PAYMENT_METHODS, type ExpensePaymentMethod } from '@modules/finance/expense/expense.model';

/**
 * What Duncit itself spends to put ONE pod on.
 *
 * Deliberately a separate collection from `Expense` (the company ledger): a pod
 * expense is always attributed to a pod, it is what makes a pod's true margin
 * knowable, and it carries the supplier bill behind the spend. Folding it into
 * the company ledger as "an expense with an optional pod" would leave the pod
 * link nullable in the one place it must never be.
 *
 * The payment methods are the company ledger's — one list of ways money leaves
 * Duncit, not two that drift (rule 34).
 */
export const POD_EXPENSE_CATEGORIES = [
  'VENUE_RENT',
  'EQUIPMENT',
  'REFRESHMENTS',
  'TRANSPORT',
  'STAFF',
  'PHOTOGRAPHY',
  'MARKETING',
  'PRIZES',
  'MATERIALS',
  'PERMITS',
  'OTHER',
] as const;
export type PodExpenseCategory = (typeof POD_EXPENSE_CATEGORIES)[number];

export { EXPENSE_PAYMENT_METHODS as POD_EXPENSE_PAYMENT_METHODS };

export interface IPodExpense extends Document {
  expense_id: string;
  pod_id: Types.ObjectId;
  date: Date;
  category: PodExpenseCategory;
  amount: number;
  description: string;
  vendor_name: string;
  payment_method: ExpensePaymentMethod;
  reference: string;
  /** Supplier's bill / invoice number, as printed on the document. */
  bill_number: string;
  /** The uploaded bill or invoice itself (image or PDF). '' = not attached yet. */
  bill_url: string;
  created_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const podExpenseSchema = new Schema<IPodExpense>(
  {
    expense_id: { type: String, required: true, unique: true, index: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true, index: true },
    date: { type: Date, required: true, index: true },
    category: { type: String, enum: POD_EXPENSE_CATEGORIES, default: 'OTHER', index: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    vendor_name: { type: String, default: '', trim: true, maxlength: 200 },
    payment_method: { type: String, enum: EXPENSE_PAYMENT_METHODS, default: 'BANK_TRANSFER' },
    reference: { type: String, default: '', trim: true, maxlength: 200 },
    bill_number: { type: String, default: '', trim: true, maxlength: 120 },
    bill_url: { type: String, default: '', trim: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The drawer always reads one pod's spend newest-first.
podExpenseSchema.index({ pod_id: 1, date: -1 });

export const PodExpenseModel = model<IPodExpense>('PodExpense', podExpenseSchema);
