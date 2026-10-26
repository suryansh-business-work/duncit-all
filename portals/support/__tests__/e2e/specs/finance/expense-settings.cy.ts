import type { RunAccount } from '../../support/run-account';
import {
  ZERO_ID,
  consoleAccount,
  expectApiRefused,
  expectFirstRow,
  releaseConsoleRole,
  signIn,
  visitAndRead,
} from '../../support/ui-finance-crm';

/**
 * Finance › Expense Settings (/settings/expenses?selectedtab=<kind>), as the
 * analyst seat (FINANCE_USER).
 *
 * Four DuncitTabs, one per option list (EXPENSE_OPTION_KINDS); the URL's
 * `selectedtab` picks the list the page asks `expenseOptionsTable` for.
 * Adding, editing, switching off and deleting an option are FINANCE_RW
 * (expenseOption.resolver.ts) — refused, probed with an id no option carries.
 */

const KINDS = ['RELATED_FROM_TYPE', 'CATEGORY', 'PAYMENT_METHOD', 'COMPENSATION_METHOD'] as const;

interface OptionRow {
  id: string;
  kind: string;
  label: string;
}

const DELETE_OPTION = `mutation E2eDeleteExpenseOption($id: ID!) { deleteExpenseOption(option_id: $id) }`;

describe('Finance · Expense Settings (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = consoleAccount('finance');
  });

  beforeEach(() => {
    signIn('finance', account);
  });

  after(() => {
    releaseConsoleRole(account, 'finance');
  });

  for (const kind of KINDS) {
    it(`FES-01-${kind} ?selectedtab=${kind} lists only that list's options`, () => {
      visitAndRead<{ expenseOptionsTable: OptionRow[] }>(
        'finance',
        `/settings/expenses?selectedtab=${kind}`,
        'ExpenseOptionsTable',
      ).then(({ expenseOptionsTable }) => {
        expect(expenseOptionsTable, `the ${kind} list has options`).to.have.length.greaterThan(0);
        for (const option of expenseOptionsTable) expect(option.kind, option.label).to.equal(kind);
        expectFirstRow('finance-expense-options', expenseOptionsTable, (r) => r.id);
      });
    });
  }

  it('FES-02 deleting an expense option is refused to the analyst', () => {
    expectApiRefused('finance', account, DELETE_OPTION, { id: ZERO_ID }, 'deleteExpenseOption');
  });
});
