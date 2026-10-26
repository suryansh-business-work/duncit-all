import type { RunAccount } from '../../support/run-account';
import { searchTable } from '../../support/tables';
import {
  consoleAccount,
  expectFirstRow,
  releaseConsoleRole,
  signIn,
  visitAndRead,
} from '../../support/ui-finance-crm';
import { specMarker } from '../../support/ui-staff';

/**
 * Finance › User Refund Logs (/user-refund-logs), as the analyst seat
 * (FINANCE_USER): every refund the platform actually paid back.
 *
 * There is no refund collection — a refund is the `metadata.refunded_at` stamp
 * one of four flows leaves on the payment it reverses
 * (server payment.refund.service.ts). So every row carries a refund time, a
 * row still SUCCESS is a part refund (`partial`), and what was returned is
 * never more than the payment took.
 */

const TABLE = 'finance-user-refunds';

interface RefundRow {
  id: string;
  payment_id: string;
  status: string;
  total: number;
  refund_amount: number;
  refunded_at: string | null;
  partial: boolean;
}

describe('Finance · User Refund Logs (run account, password CHANGED)', () => {
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

  it('FUR-01 every listed refund was paid back, part refunds are the payments still SUCCESS, and none returns more than it took', () => {
    visitAndRead<{ userRefundsTable: { rows: RefundRow[] } }>('finance', '/user-refund-logs', 'UserRefundsTable').then(
      ({ userRefundsTable }) => {
        for (const row of userRefundsTable.rows) {
          expect(row.refunded_at, `${row.payment_id} carries its refund time`).to.be.a('string').and.not.be.empty;
          expect(row.partial, `${row.payment_id} is a part refund exactly when still SUCCESS`).to.equal(row.status === 'SUCCESS');
          expect(row.refund_amount, `${row.payment_id} returned`).to.be.at.least(0).and.at.most(row.total + 0.01);
        }
        expectFirstRow(TABLE, userRefundsTable.rows, (r) => r.id);
      },
    );
  });

  it('FUR-02 a search that matches no refund reads the empty line', () => {
    visitAndRead('finance', '/user-refund-logs', 'UserRefundsTable');
    searchTable('UserRefundsTable', `${specMarker(account, 'finance-refunds')} no such refund`);
    cy.byTestIdPrefix(`${TABLE}-row-`).should('not.exist');
    cy.byTestId('duncit-table-empty').should('be.visible');
  });
});
