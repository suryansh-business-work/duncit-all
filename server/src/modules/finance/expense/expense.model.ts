import { Schema, model, Types, type Document } from 'mongoose';

export const EXPENSE_CATEGORIES = [
  'RENT',
  'SALARY',
  'MARKETING',
  'UTILITIES',
  'SOFTWARE',
  'TRAVEL',
  'LOGISTICS',
  'OFFICE',
  'PROFESSIONAL_FEES',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_PAYMENT_METHODS = ['UPI', 'BANK_TRANSFER', 'CASH', 'CARD', 'CHEQUE', 'OTHER'] as const;
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

/** A refund received against an expense — builds the expense's timeline. */
export interface IExpenseRefund {
  refund_id: string;
  date: Date;
  amount: number;
  note: string;
  created_at: Date;
}

export interface IExpense extends Document {
  expense_id: string;
  date: Date;
  category: ExpenseCategory;
  amount: number;
  description: string;
  vendor_name: string;
  payment_method: ExpensePaymentMethod;
  reference: string;
  attachment_url: string;
  refunds: IExpenseRefund[];
  created_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const refundSchema = new Schema<IExpenseRefund>(
  {
    refund_id: { type: String, required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, default: '', trim: true, maxlength: 300 },
    created_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const expenseSchema = new Schema<IExpense>(
  {
    expense_id: { type: String, required: true, unique: true, index: true },
    date: { type: Date, required: true, index: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, default: 'OTHER', index: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    vendor_name: { type: String, default: '', trim: true, maxlength: 200 },
    payment_method: { type: String, enum: EXPENSE_PAYMENT_METHODS, default: 'BANK_TRANSFER' },
    reference: { type: String, default: '', trim: true, maxlength: 200 },
    attachment_url: { type: String, default: '', trim: true },
    refunds: { type: [refundSchema], default: [] },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

expenseSchema.index({ date: -1 });

export const ExpenseModel = model<IExpense>('Expense', expenseSchema);
