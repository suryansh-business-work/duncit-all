import type { RunAccount } from '../../support/run-account';
import {
  ZERO_ID,
  consoleAccount,
  expectApiRefused,
  expectFirstRow,
  releaseConsoleRole,
  samePaisa,
  signIn,
  visitAndRead,
} from '../../support/ui-finance-crm';

/**
 * Finance › Duncit Expenses (/ledger), as the analyst seat (FINANCE_USER).
 *
 * The ledger lists every expense, and its summary chips read Gross, Refund and
 * Net, where Net = Gross − Refund (expense.service.ts summary). Recording,
 * compensating, refunding and deleting an expense are FINANCE_RW writes
 * (expense.resolver.ts): the analyst is refused, probed with an id no expense
 * carries — the record / reject / remove-refund / delete rows are
 * FINANCE_MANAGER scenarios this run cannot hold.
 */

const TABLE = 'finance-expenses';

interface ExpenseSummary {
  total: number;
  gross_total: number;
  refund_total: number;
  count: number;
}

const DELETE_EXPENSE = `mutation E2eDeleteExpense($id: ID!) { deleteExpense(expense_doc_id: $id) }`;

const REMOVE_EXPENSE_REFUND = `mutation E2eRemoveExpenseRefund($id: ID!, $refund: String!) {
  removeExpenseRefund(expense_doc_id: $id, refund_id: $refund) { id }
}`;

describe('Finance · Duncit Expenses (run account, password CHANGED)', () => {
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

  it('FDE-01 the ledger lists expenses, and its Net is the Gross less the refunds', () => {
    cy.interceptOperation('ExpenseSummary');
    visitAndRead<{ expensesTable: { total: number; rows: { id: string }[] } }>('finance', '/ledger', 'ExpensesTable').then(
      ({ expensesTable }) => {
        expectFirstRow(TABLE, expensesTable.rows, (r) => r.id);
        cy.wait('@ExpenseSummary').then(({ response }) => {
          expect(response?.body.errors, 'the analyst reads the summary').to.be.undefined;
          const summary = response?.body.data.expenseSummary as ExpenseSummary;
          expect(samePaisa(summary.total, summary.gross_total - summary.refund_total), 'Net = Gross − Refund').to.be.true;
          expect(summary.refund_total, 'refunds never exceed what was spent').to.be.at.most(summary.gross_total + 0.01);
        });
      },
    );
  });

  it('FDE-02 deleting an expense or removing one of its refunds is refused to the analyst', () => {
    expectApiRefused('finance', account, DELETE_EXPENSE, { id: ZERO_ID }, 'deleteExpense');
    expectApiRefused('finance', account, REMOVE_EXPENSE_REFUND, { id: ZERO_ID, refund: 'e2e-probe' }, 'removeExpenseRefund');
  });
});
