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
 * Finance › Backout Refunds (/backout-refunds, /backout-refunds/:id), as the
 * analyst seat (FINANCE_USER).
 *
 * FINANCE_USER is the read-only seat: "every query that console READS adds this
 * role to its gate" (FINANCE_READER, server/src/middleware/rbac.ts), so the two
 * reads behind this page — `backoutRefundRequestsTable` and
 * `backoutRefundRequest` — answer the analyst. Processing a refund (ADMIN_RW)
 * is refused, as it must be.
 */

const TABLE = 'finance-backout-refunds';

interface BackoutRow {
  id: string;
  backout_no: string;
}

const PROCESS_BACKOUT_REFUND = `mutation E2eProcessBackoutRefund($id: ID!) {
  processBackoutRefund(id: $id) { id }
}`;

describe('Finance · Backout Refunds (run account, password CHANGED)', () => {
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

  it('FBR-01 the analyst reads the backout refund queue', () => {
    visitAndRead<{ backoutRefundRequestsTable: { rows: BackoutRow[] } }>(
      'finance',
      '/backout-refunds',
      'BackoutRefundRequestsTable',
    ).then(({ backoutRefundRequestsTable }) => {
      expectFirstRow(TABLE, backoutRefundRequestsTable.rows, (r) => r.id);
    });
  });

  it('FBR-02 an unknown backout id reads "Backout refund request not found."', () => {
    visitAndRead('finance', `/backout-refunds/${ZERO_ID}`, 'BackoutRefundDetail');
    cy.byTestId('query-guard-not-found').should('contain.text', 'Backout refund request not found.');
  });

  it('FBR-03 processing a backout refund is refused to the analyst', () => {
    expectApiRefused('finance', account, PROCESS_BACKOUT_REFUND, { id: ZERO_ID }, 'processBackoutRefund');
  });
});
