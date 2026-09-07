import { Schema, model, Types, type Document } from 'mongoose';

/**
 * The ORIGINAL compiled category list, kept only as the seed for the editable
 * one. Categories now live in the `ExpenseOption` collection (kind CATEGORY),
 * because Finance asked for a new one roughly every month and each ask was a
 * code change in three places. Every key here is seeded as an INACTIVE option
 * so the expenses already filed under it still read correctly.
 *
 * Nothing validates against this array any more — `expense.service` checks a
 * submitted key against the live option list instead.
 */
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

/**
 * Where an expense stands on being paid back.
 *
 * DERIVED from the money on every write (see {@link deriveCompensationStatus}),
 * not typed by hand — a status reading "Fully compensated" beside a compensated
 * amount of zero is the exact disagreement this screen exists to remove.
 * REJECTED is the one an operator states, because no amount implies it.
 */
export const EXPENSE_COMPENSATION_STATUSES = [
  'PENDING',
  'PARTIAL',
  'FULL',
  'REJECTED',
] as const;
export type ExpenseCompensationStatus = (typeof EXPENSE_COMPENSATION_STATUSES)[number];

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
  category: string;
  amount: number;
  description: string;
  vendor_name: string;
  payment_method: string;
  reference: string;
  attachment_url: string;
  /**
   * What this expense was FOR — a config key from ExpenseOption
   * (RELATED_FROM_TYPE), the id of the thing itself, and the name it had when
   * it was filed. '' when the expense is not attributable to anything.
   */
  related_from_type: string;
  related_from_id: Types.ObjectId | null;
  /**
   * A SNAPSHOT of the entity's name, on purpose. A pod is renamed and a venue
   * is deleted; the ledger still has to say what the money was spent on, and a
   * join that answers "(deleted)" is not an answer an auditor accepts.
   */
  related_from_name: string;
  /** Who actually paid — a person, a card, a partner. Free text by design. */
  paid_by: string;
  compensation_status: ExpenseCompensationStatus;
  /** A config key from ExpenseOption (COMPENSATION_METHOD); '' until decided. */
  compensation_method: string;
  compensated_amount: number;
  compensation_date: Date | null;
  compensation_reference: string;
  refunds: IExpenseRefund[];
  created_by: Types.ObjectId | null;
  updated_by: Types.ObjectId | null;
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
    // No mongoose enum: the valid set is the ExpenseOption list, checked in
    // the service. An enum here would mean every option Finance adds needs a
    // deploy before it can be saved — which is the thing being removed.
    category: { type: String, default: 'MISCELLANEOUS', trim: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    vendor_name: { type: String, default: '', trim: true, maxlength: 200 },
    payment_method: { type: String, default: 'BANK_TRANSFER', trim: true, index: true },
    reference: { type: String, default: '', trim: true, maxlength: 200 },
    attachment_url: { type: String, default: '', trim: true },
    related_from_type: { type: String, default: '', trim: true, index: true },
    related_from_id: { type: Schema.Types.ObjectId, default: null, index: true },
    related_from_name: { type: String, default: '', trim: true, maxlength: 300 },
    paid_by: { type: String, default: '', trim: true, maxlength: 200 },
    compensation_status: {
      type: String,
      enum: EXPENSE_COMPENSATION_STATUSES,
      default: 'PENDING',
      index: true,
    },
    compensation_method: { type: String, default: '', trim: true, index: true },
    compensated_amount: { type: Number, default: 0, min: 0 },
    compensation_date: { type: Date, default: null },
    compensation_reference: { type: String, default: '', trim: true, maxlength: 200 },
    refunds: { type: [refundSchema], default: [] },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

expenseSchema.index({ date: -1 });
// The dashboard's two headline reads: one entity's whole spend, and the queue
// of expenses still waiting to be paid back.
expenseSchema.index({ related_from_type: 1, related_from_id: 1, date: -1 });
expenseSchema.index({ compensation_status: 1, date: -1 });

/**
 * Where an expense stands, from the money alone.
 *
 * A rejection is a decision and survives; everything else is arithmetic, so
 * there is nothing to keep in step by hand.
 */
export function deriveCompensationStatus(
  amount: number,
  compensated: number,
  rejected: boolean
): ExpenseCompensationStatus {
  if (rejected) return 'REJECTED';
  if (compensated <= 0) return 'PENDING';
  if (compensated >= amount) return 'FULL';
  return 'PARTIAL';
}

export const ExpenseModel = model<IExpense>('Expense', expenseSchema);
