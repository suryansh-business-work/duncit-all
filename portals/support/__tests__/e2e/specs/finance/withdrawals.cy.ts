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
 * Finance › Withdrawals (/withdrawals, /withdrawals/:podId,
 * /withdrawals/settings), as the analyst seat (FINANCE_USER).
 *
 * The analyst reads the pod-grouped queue, one pod's requests and the
 * per-role minimums (FINANCE_READ in wallet.resolver.ts). Marking a request
 * paid, rejecting it and changing a minimum are FINANCE_RW writes: refused,
 * probed with an id no withdrawal carries and an empty minimums input, so no
 * payout can ever move.
 */

const GROUPS_TABLE = 'finance-withdrawal-pods';

interface PodGroup {
  pod_id: string;
  pod_title: string;
  withdrawal_count: number;
}

interface Minimums {
  host: number;
  venue_owner: number;
  ecomm_manager: number;
  club_admin: number;
}

const REVIEW_WITHDRAWAL = `mutation E2eReviewWithdrawal($id: ID!, $input: ReviewWithdrawalInput!) {
  reviewWithdrawal(withdrawal_id: $id, input: $input) { id }
}`;

const UPDATE_MINIMUMS = `mutation E2eUpdateWithdrawalMinimums($input: UpdateWithdrawalMinimumsInput!) {
  updateWithdrawalMinimums(input: $input) { host }
}`;

describe('Finance · Withdrawals (run account, password CHANGED)', () => {
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

  it('FWD-01 the queue groups requests by pod, and a pod opens its own requests', () => {
    visitAndRead<{ podWithdrawalGroupsTable: { rows: PodGroup[] } }>('finance', '/withdrawals', 'PodWithdrawalGroupsTable').then(
      ({ podWithdrawalGroupsTable }) => {
        const rows = podWithdrawalGroupsTable.rows;
        expect(rows, 'staging holds a withdrawal request').to.have.length.greaterThan(0);
        expectFirstRow(GROUPS_TABLE, rows, (r) => r.pod_id);
        const [group] = rows;
        if (!group) return;
        for (const row of rows) expect(row.withdrawal_count, `${row.pod_title} groups at least one request`).to.be.at.least(1);
        cy.interceptOperation('PodWithdrawalsTable');
        cy.byTestId(`${GROUPS_TABLE}-row-${group.pod_id}`).first().click(24, 16);
        cy.location('pathname').should('eq', `/withdrawals/${group.pod_id}`);
        cy.wait('@PodWithdrawalsTable').then(({ response }) => {
          expect(response?.body.errors, 'the pod drill-down answers the analyst').to.be.undefined;
          expect(response?.body.data.podWithdrawalsTable.total, 'the pod lists the requests it groups').to.equal(
            group.withdrawal_count,
          );
        });
      },
    );
  });

  it('FWD-02 the settings page reads each role\'s minimum, and changing one is refused to the analyst', () => {
    visitAndRead<{ withdrawalMinimums: Minimums }>('finance', '/withdrawals/settings', 'WithdrawalMinimums').then(
      ({ withdrawalMinimums }) => {
        for (const value of Object.values(withdrawalMinimums)) expect(value, 'a minimum is a number').to.be.a('number');
      },
    );
    expectApiRefused('finance', account, UPDATE_MINIMUMS, { input: {} }, 'updateWithdrawalMinimums');
  });

  it('FWD-03 marking a withdrawal paid or rejecting it is refused to the analyst', () => {
    expectApiRefused('finance', account, REVIEW_WITHDRAWAL, { id: ZERO_ID, input: { status: 'PAID' } }, 'reviewWithdrawal');
    expectApiRefused(
      'finance',
      account,
      REVIEW_WITHDRAWAL,
      { id: ZERO_ID, input: { status: 'REJECTED', reason: 'e2e refusal probe' } },
      'reviewWithdrawal',
    );
  });
});
