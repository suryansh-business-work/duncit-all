/**
 * Employee expense claims — the shape both ends of the flow agree on.
 *
 * The Employee console files a claim and the Finance console decides on it, so
 * the category list, the selection each portal asks the server for and the row
 * it reads back exist twice by definition. Two hand-kept copies drift on
 * exactly the part that matters: a category added on one side only is a claim
 * the other portal renders as blank, and a field dropped from one selection is
 * a column that silently shows nothing (rule 40).
 *
 * Deliberately DATA ONLY — no formatting helper, no component. The two portals
 * are MUI twins of one screen: they share the shape, never the UI.
 */

/** Mirrors EMPLOYEE_EXPENSE_CATEGORIES on the server; it drops anything else. */
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

/** The company ledger's list — one set of ways money moves, not two (rule 34). */
export const EMPLOYEE_EXPENSE_PAYMENT_METHODS = [
  'UPI',
  'BANK_TRANSFER',
  'CASH',
  'CARD',
  'CHEQUE',
  'OTHER',
] as const;

export const EMPLOYEE_EXPENSE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type EmployeeExpenseStatus = (typeof EMPLOYEE_EXPENSE_STATUSES)[number];

/** Chip colour per state, so the two consoles never disagree about what red means. */
export const EMPLOYEE_EXPENSE_STATUS_COLORS = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
} as const;

/**
 * Status -> translation key, written out rather than composed: the rule-38 gate
 * only sees a key that appears somewhere as a quoted literal, so a key built
 * from a template string ships as copy nothing renders.
 */
export const EMPLOYEE_EXPENSE_STATUS_KEYS: Readonly<Record<EmployeeExpenseStatus, string>> = {
  PENDING: 'employeeExpense.status.PENDING',
  APPROVED: 'employeeExpense.status.APPROVED',
  REJECTED: 'employeeExpense.status.REJECTED',
};

/**
 * The GraphQL selection both consoles make on `EmployeeExpense`.
 *
 * `employee_name` / `employee_email` are in it for both: the employee's own
 * list ignores them, and one selection is what stops a field being added to the
 * queue and forgotten on the list it came from.
 */
export const EMPLOYEE_EXPENSE_SELECTION = `
  id
  claim_id
  employee_id
  employee_name
  employee_email
  date
  category
  amount
  description
  merchant
  payment_method
  reference
  bill_number
  bill_url
  status
  reviewed_at
  review_note
  created_at
`;

/** One claim, as both consoles read it back. */
export interface EmployeeExpenseClaim {
  id: string;
  claim_id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  merchant: string;
  payment_method: string;
  reference: string;
  bill_number: string;
  bill_url: string;
  status: EmployeeExpenseStatus;
  reviewed_at: string | null;
  review_note: string;
  created_at: string;
}

/** The tiles' numbers — the employee's own claims, or every employee's. */
export interface EmployeeExpenseTotals {
  claimed_total: number;
  pending_total: number;
  approved_total: number;
  rejected_total: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  claim_count: number;
  employee_count: number;
}

/** The `EmployeeExpenseInput` the create/update mutations take. */
export interface EmployeeExpenseInput {
  date: string;
  category: string;
  amount: number;
  merchant: string;
  payment_method: string;
  bill_number: string;
  bill_url: string;
  reference: string;
  description: string;
}
