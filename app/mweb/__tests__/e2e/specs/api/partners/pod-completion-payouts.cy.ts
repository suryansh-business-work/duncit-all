/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs } from '../../../support/access-steps';
import { expectEachRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Pod completion & payouts — completing a pod raises PENDING payment
 * releases; only Finance (and the platform admins) approve them
 * (finance/finance/finance.resolver.ts: `approvePodPaymentRelease` asks for
 * ADMIN_RW, `podPaymentRelease` for FINANCE_READ, each as its first line).
 * The Pods console role is not a Finance role. The member's refusal is
 * staff-operations SA-05/SA-06; completing a pod that does not exist is
 * specs/api/apps/host-complete-earnings.cy.ts HE-01.
 * Scenario map: Partners › Pod completion & payouts ("Pods staff cannot approve payouts").
 */

const APPROVE = `mutation E2ePodsApproveRelease($id: ID!) { approvePodPaymentRelease(id: $id) { __typename } }`;
const RELEASE = `query E2ePodsReadRelease($id: ID!) { podPaymentRelease(id: $id) { __typename } }`;

describe('API · Pods staff raise completions but never approve payouts', { testIsolation: false }, () => {
  let podsStaffToken = '';

  before(() => {
    signInRunAs(['ALL_PODS_ACCESS']).then((token) => {
      podsStaffToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ALL_PODS_ACCESS']);
  });

  it('PCO-01 ALL_PODS_ACCESS is refused approving a payment release and reading one', () => {
    expectEachRefused('approvePodPaymentRelease', APPROVE, { id: NO_ID }, [[podsStaffToken, ACCESS_DENIED]]);
    expectEachRefused('podPaymentRelease', RELEASE, { id: NO_ID }, [[podsStaffToken, ACCESS_DENIED]]);
  });
});
