/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs, SIGNED_OUT } from '../../../support/access-steps';
import { expectEachRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Wallet & withdrawals (/wallet) — a partner's wallet is read and drawn on by
 * its owner only: every wallet read and `requestWithdrawal` take no user
 * argument and act on the token's own account (finance/wallet/wallet.resolver.ts),
 * while the withdrawal queue, its review and the minimums are Finance-only
 * (FINANCE_RW / FINANCE_READ). A partner role is not a Finance role.
 * The member's own refused withdrawal is specs/api/staff/withdrawals.cy.ts WD-01.
 * Scenario map: Partners › Wallet & withdrawals.
 */

const REQUEST = `mutation E2eRequestWithdrawal($input: RequestWithdrawalInput!) { requestWithdrawal(input: $input) { __typename } }`;
const QUEUE = `query E2eWithdrawalQueue { withdrawalRequestsTable(query: { page_size: 1 }) { total } }`;
const REVIEW = `mutation E2eReviewWithdrawal($id: ID!) {
  reviewWithdrawal(withdrawal_id: $id, input: { status: REJECTED, reason: "e2e" }) { __typename }
}`;
const MINIMUMS = `query E2eWithdrawalMinimums { withdrawalMinimums { __typename } }`;
const POD_WITHDRAWALS = `query E2ePodWithdrawals($id: ID!) { podWithdrawalsTable(pod_id: $id) { total } }`;

describe('API · A partner draws on their own wallet and reaches no Finance operation', { testIsolation: false }, () => {
  let partnerToken = '';

  before(() => {
    signInRunAs(['ECOMM_MANAGER']).then((token) => {
      partnerToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ECOMM_MANAGER']);
  });

  it('WW-01 a withdrawal cannot be asked for signed out', () => {
    const input = { amount: 1, payout_method: 'UPI', upi_id: 'nobody@upi' };
    expectEachRefused('requestWithdrawal', REQUEST, { input }, [[null, SIGNED_OUT]]);
  });

  it('WW-02 a partner role is refused the withdrawal queue and its review', () => {
    expectEachRefused('withdrawalRequestsTable', QUEUE, {}, [[partnerToken, ACCESS_DENIED]]);
    expectEachRefused('reviewWithdrawal', REVIEW, { id: NO_ID }, [[partnerToken, ACCESS_DENIED]]);
  });

  it('WW-03 a partner role is refused the minimums and another pod’s withdrawals', () => {
    expectEachRefused('withdrawalMinimums', MINIMUMS, {}, [[partnerToken, ACCESS_DENIED]]);
    expectEachRefused('podWithdrawalsTable', POD_WITHDRAWALS, { id: NO_ID }, [[partnerToken, ACCESS_DENIED]]);
  });
});
