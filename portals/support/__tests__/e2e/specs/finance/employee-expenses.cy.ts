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
 * Finance › Employee Expenses (/employee-expenses), as the analyst seat
 * (FINANCE_USER).
 *
 * The KPIs count every claim as pending + approved + rejected
 * (employeeExpense.service.ts summary). Approving or rejecting a claim is
 * FINANCE_RW (`reviewEmployeeExpense`) — refused, probed with an id no claim
 * carries, so the approve / reject rows are FINANCE_MANAGER scenarios.
 */

const TABLE = 'finance-employee-expenses';

interface Summary {
  claim_count: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
}

const REVIEW_CLAIM = `mutation E2eReviewEmployeeExpense($id: ID!, $decision: String!, $note: String) {
  reviewEmployeeExpense(expense_doc_id: $id, decision: $decision, note: $note) { id }
}`;

describe('Finance · Employee Expenses (run account, password CHANGED)', () => {
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

  it('FEE-01 the claims list loads and the KPIs split every claim by status', () => {
    cy.interceptOperation('EmployeeExpenseSummary');
    visitAndRead<{ employeeExpensesTable: { rows: { id: string }[] } }>(
      'finance',
      '/employee-expenses',
      'EmployeeExpensesTable',
    ).then(({ employeeExpensesTable }) => {
      expectFirstRow(TABLE, employeeExpensesTable.rows, (r) => r.id);
    });
    cy.wait('@EmployeeExpenseSummary').then(({ response }) => {
      expect(response?.body.errors, 'the analyst reads the KPIs').to.be.undefined;
      const s = response?.body.data.employeeExpenseSummary as Summary;
      expect(s.pending_count + s.approved_count + s.rejected_count, 'claims by status').to.equal(s.claim_count);
    });
  });

  it('FEE-02 approving or rejecting a claim is refused to the analyst', () => {
    expectApiRefused('finance', account, REVIEW_CLAIM, { id: ZERO_ID, decision: 'APPROVED' }, 'reviewEmployeeExpense');
    expectApiRefused(
      'finance',
      account,
      REVIEW_CLAIM,
      { id: ZERO_ID, decision: 'REJECTED', note: 'e2e refusal probe' },
      'reviewEmployeeExpense',
    );
  });
});
