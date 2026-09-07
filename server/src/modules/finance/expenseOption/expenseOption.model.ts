import { Schema, model, Types, type Document } from 'mongoose';

/**
 * Every dropdown on the Expense form, as DATA rather than as a TypeScript enum.
 *
 * Finance kept asking for one more category and one more way an expense gets
 * paid back, and each ask was a code change in three places — the mongoose
 * enum, the portal's constant array, and whatever the form rendered. This
 * collection is the single list, edited from Finance > Settings > Expense
 * Settings, and the form renders whatever is active.
 *
 * It is a near-twin of CRM's `ManagedOption` and deliberately NOT the same
 * collection: that one stores a display `name` and nothing else, which is fine
 * for an amenity nobody references by id. An expense STORES its category, so
 * this one needs a stable `key` the row keeps when the label is reworded.
 *
 * Four independent lists live here, told apart by {@link kind}:
 *  - RELATED_FROM_TYPE — what an expense can be attributed to (Pod, Club, …)
 *  - CATEGORY          — what the money went on
 *  - PAYMENT_METHOD    — how the money left Duncit
 *  - COMPENSATION_METHOD — how it came back
 */
export const EXPENSE_OPTION_KINDS = [
  'RELATED_FROM_TYPE',
  'CATEGORY',
  'PAYMENT_METHOD',
  'COMPENSATION_METHOD',
] as const;
export type ExpenseOptionKind = (typeof EXPENSE_OPTION_KINDS)[number];

export interface IExpenseOption extends Document {
  /** Narrowed from Document's `unknown`: every read of this doc stringifies it. */
  _id: Types.ObjectId;
  kind: ExpenseOptionKind;
  /**
   * CONSTANT_CASE code, unique within its kind. This is what an expense row
   * stores, so it NEVER changes after creation — renaming is a `label` edit.
   */
  key: string;
  label: string;
  /**
   * RELATED_FROM_TYPE only: which entity list the picker searches, named from
   * the server's source registry. Empty on every other kind.
   *
   * A type whose source the registry does not know still saves and still
   * labels old rows — its picker simply offers nothing, which is visible on
   * screen rather than a crash.
   */
  entity_source: string;
  sort_order: number;
  is_active: boolean;
  /**
   * Seeded by the platform. Can be reworded, reordered and disabled like any
   * other row, but never deleted — the boot seed would put it straight back,
   * and rows already pointing at it would be left naming nothing.
   */
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

const expenseOptionSchema = new Schema<IExpenseOption>(
  {
    kind: { type: String, enum: EXPENSE_OPTION_KINDS, required: true, index: true },
    key: { type: String, required: true, trim: true, uppercase: true, maxlength: 60 },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    entity_source: { type: String, default: '', trim: true, maxlength: 60 },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
    is_system: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One key per list — what makes the key safe to store on an expense.
expenseOptionSchema.index({ kind: 1, key: 1 }, { unique: true });
// Both the form's dropdown and the settings table read one list in order.
expenseOptionSchema.index({ kind: 1, sort_order: 1 });

export const ExpenseOptionModel = model<IExpenseOption>('ExpenseOption', expenseOptionSchema);
