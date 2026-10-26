import type { RunAccount } from '../../support/run-account';
import { consoleAccount, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';

/**
 * Finance › Expense Dashboard (/expenses/dashboard), as the analyst seat
 * (FINANCE_USER). Read-only.
 *
 * One `expenseDashboard` answer drives every tile and breakdown
 * (server expense/expense.dashboard.ts): the status tiles split the expense
 * count, and each breakdown — an unattributed expense included, under an empty
 * key — adds up to the whole spend.
 */

interface Slice {
  key: string;
  total: number;
  count: number;
}

interface ExpenseDashboard {
  total_expenses: number;
  expense_count: number;
  pending_count: number;
  partial_count: number;
  full_count: number;
  rejected_count: number;
  by_category: Slice[];
  by_related_type: Slice[];
  by_compensation_method: Slice[];
}

const sum = (slices: readonly Slice[], field: 'total' | 'count') => slices.reduce((s, x) => s + x[field], 0);

describe('Finance · Expense Dashboard (run account, password CHANGED)', () => {
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

  it('FED-01 the status tiles split every expense, and each breakdown adds up to the whole spend', () => {
    visitAndRead<{ expenseDashboard: ExpenseDashboard }>('finance', '/expenses/dashboard', 'ExpenseDashboard').then(
      ({ expenseDashboard: d }) => {
        expect(d.pending_count + d.partial_count + d.full_count + d.rejected_count, 'the status tiles').to.equal(d.expense_count);
        for (const [name, slices] of [
          ['category', d.by_category],
          ['related type', d.by_related_type],
          ['compensation method', d.by_compensation_method],
        ] as const) {
          expect(sum(slices, 'count'), `the ${name} breakdown counts every expense`).to.equal(d.expense_count);
          // Each slice is rounded to the paisa on its own.
          expect(Math.abs(sum(slices, 'total') - d.total_expenses), `the ${name} breakdown adds up to the total`).to.be.at.most(0.01 * slices.length + 0.001);
        }
      },
    );
  });
});
