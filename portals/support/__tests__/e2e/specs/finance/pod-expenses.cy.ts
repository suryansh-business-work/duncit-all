import type { RunAccount } from '../../support/run-account';
import {
  ZERO_ID,
  consoleAccount,
  expectApiRefused,
  releaseConsoleRole,
  signIn,
  visitAndRead,
} from '../../support/ui-finance-crm';

/**
 * Finance › Pod Expenses (/pod-expenses), as the analyst seat (FINANCE_USER).
 *
 * One row per pod with its spend and entry count (row id = pod_doc_id,
 * PodExpensePodsTable.tsx); a pod opens a drawer listing its entries
 * (`podExpensesTable`). Recording, editing and deleting an entry are
 * FINANCE_RW (podExpense.resolver.ts) — refused, probed with an id no entry
 * carries.
 */

const TABLE = 'finance-pod-expenses';

interface PodRow {
  pod_doc_id: string;
  pod_title: string;
  expense_count: number;
}

const DELETE_POD_EXPENSE = `mutation E2eDeletePodExpense($id: ID!) { deletePodExpense(expense_doc_id: $id) }`;

describe('Finance · Pod Expenses (run account, password CHANGED)', () => {
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

  it('FPE-01 a pod opens the drawer listing exactly the entries its row counts', () => {
    visitAndRead<{ podExpensePodsTable: { rows: PodRow[] } }>('finance', '/pod-expenses', 'PodExpensePodsTable').then(
      ({ podExpensePodsTable }) => {
        const pod = podExpensePodsTable.rows.find((r) => r.expense_count > 0);
        expect(pod, 'staging holds a pod with a recorded expense').to.exist;
        if (!pod) return;
        cy.interceptOperation('PodExpensesTable');
        cy.byTestId(`${TABLE}-row-${pod.pod_doc_id}`).first().click(24, 16);
        cy.wait('@PodExpensesTable').then(({ response }) => {
          expect(response?.body.errors, 'the analyst reads the pod\'s entries').to.be.undefined;
          expect(response?.body.data.podExpensesTable.total, `${pod.pod_title} entries`).to.equal(pod.expense_count);
        });
      },
    );
  });

  it('FPE-02 deleting a pod expense is refused to the analyst', () => {
    expectApiRefused('finance', account, DELETE_POD_EXPENSE, { id: ZERO_ID }, 'deletePodExpense');
  });
});
