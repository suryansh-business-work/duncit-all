import type { ExpenseOptionKind } from './expenseOption.model';

export interface ExpenseOptionSeed {
  kind: ExpenseOptionKind;
  key: string;
  label: string;
  entity_source?: string;
  /**
   * Seeded switched OFF. Used for the categories and methods that EXISTING
   * ledger rows already carry: an inactive option still resolves to its label,
   * so an expense filed last year still reads correctly, while the form stops
   * offering it. This is the "existing expenses remain linked even if a
   * configuration option is later disabled" rule, applied at seed time.
   */
  inactive?: boolean;
}

/**
 * The configuration Finance starts with. Everything here is `is_system`: it can
 * be reworded, reordered and switched off, but not deleted — deleting a row an
 * expense points at would leave that expense naming nothing, and the next boot
 * would re-create it anyway.
 *
 * Order in this array IS the order on screen: `sort_order` is the index.
 */
export const EXPENSE_OPTION_SEEDS: ExpenseOptionSeed[] = [
  // What an expense can be attributed to. `entity_source` names the list the
  // picker searches — see expenseOption.sources.ts.
  { kind: 'RELATED_FROM_TYPE', key: 'POD', label: 'Pod', entity_source: 'POD' },
  { kind: 'RELATED_FROM_TYPE', key: 'CLUB', label: 'Club', entity_source: 'CLUB' },
  { kind: 'RELATED_FROM_TYPE', key: 'VENUE', label: 'Venue', entity_source: 'VENUE' },
  { kind: 'RELATED_FROM_TYPE', key: 'CLUB_ADMIN', label: 'Club Admin', entity_source: 'CLUB_ADMIN' },
  { kind: 'RELATED_FROM_TYPE', key: 'HOST', label: 'Host', entity_source: 'HOST' },

  // What the money went on.
  { kind: 'CATEGORY', key: 'FOOD_AND_BEVERAGE', label: 'Food & Beverage' },
  { kind: 'CATEGORY', key: 'VENUE', label: 'Venue' },
  { kind: 'CATEGORY', key: 'TRANSPORT', label: 'Transport' },
  { kind: 'CATEGORY', key: 'MARKETING', label: 'Marketing' },
  { kind: 'CATEGORY', key: 'EVENT_MATERIAL', label: 'Event Material' },
  { kind: 'CATEGORY', key: 'EQUIPMENT', label: 'Equipment' },
  { kind: 'CATEGORY', key: 'STAFF', label: 'Staff' },
  { kind: 'CATEGORY', key: 'MISCELLANEOUS', label: 'Miscellaneous' },
  // The ledger's original enum. Seeded OFF so the form no longer offers them,
  // and seeded AT ALL so every expense already filed under one still has a name.
  { kind: 'CATEGORY', key: 'RENT', label: 'Rent', inactive: true },
  { kind: 'CATEGORY', key: 'SALARY', label: 'Salary', inactive: true },
  { kind: 'CATEGORY', key: 'UTILITIES', label: 'Utilities', inactive: true },
  { kind: 'CATEGORY', key: 'SOFTWARE', label: 'Software', inactive: true },
  { kind: 'CATEGORY', key: 'TRAVEL', label: 'Travel', inactive: true },
  { kind: 'CATEGORY', key: 'LOGISTICS', label: 'Logistics', inactive: true },
  { kind: 'CATEGORY', key: 'OFFICE', label: 'Office', inactive: true },
  { kind: 'CATEGORY', key: 'PROFESSIONAL_FEES', label: 'Professional Fees', inactive: true },
  { kind: 'CATEGORY', key: 'OTHER', label: 'Other', inactive: true },

  // How the money left Duncit. These are the ledger's existing list, moved out
  // of two hardcoded arrays and into the one place Finance can edit.
  { kind: 'PAYMENT_METHOD', key: 'UPI', label: 'UPI' },
  { kind: 'PAYMENT_METHOD', key: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { kind: 'PAYMENT_METHOD', key: 'CASH', label: 'Cash' },
  { kind: 'PAYMENT_METHOD', key: 'CARD', label: 'Card' },
  { kind: 'PAYMENT_METHOD', key: 'CHEQUE', label: 'Cheque' },
  { kind: 'PAYMENT_METHOD', key: 'OTHER', label: 'Other' },

  // How it comes back. NOT_COMPENSATED is a method on purpose: "we looked at
  // this and decided nobody pays it back" is a decision, not an absence of one.
  { kind: 'COMPENSATION_METHOD', key: 'CASH', label: 'Cash' },
  { kind: 'COMPENSATION_METHOD', key: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { kind: 'COMPENSATION_METHOD', key: 'UPI', label: 'UPI' },
  { kind: 'COMPENSATION_METHOD', key: 'DUNCIT_COIN', label: 'Duncit Coin' },
  { kind: 'COMPENSATION_METHOD', key: 'COUPON', label: 'Coupon' },
  { kind: 'COMPENSATION_METHOD', key: 'VOUCHER', label: 'Voucher' },
  { kind: 'COMPENSATION_METHOD', key: 'WALLET_CREDIT', label: 'Wallet Credit' },
  { kind: 'COMPENSATION_METHOD', key: 'REFUND', label: 'Refund' },
  { kind: 'COMPENSATION_METHOD', key: 'ADJUSTMENT', label: 'Adjustment' },
  { kind: 'COMPENSATION_METHOD', key: 'NOT_COMPENSATED', label: 'Not Compensated' },
];
