/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRead, NO_ID } from '../../../support/api-staff';

/**
 * Ads — ADS_MANAGER submits and follows its own ad requests (ADS_SUBMIT);
 * reviewing, stopping, deleting and the review queue are SUPER_ADMIN and
 * MARKETING_MANAGER only (ads/ads.resolver.ts MARKETING_REVIEW, first
 * statement). Scenario map: Staff › Ads "ADS_MANAGER cannot approve its own ad".
 */

const ROLES: readonly E2eStaffRole[] = ['ADS_MANAGER'];

const MY_DASHBOARD = call('myAdsDashboard', `query E2eMyAdsDashboard { myAdsDashboard { total pending } }`);
const REVIEW_CALLS = [
  call('adRequestsTable', `query E2eAdRequests { adRequestsTable(query: { page_size: 1 }) { total } }`),
  call(
    'reviewAdRequest',
    `mutation E2eReviewAd($id: ID!) { reviewAdRequest(id: $id, approve: true, remarks: "e2e") { __typename } }`,
    { id: NO_ID },
  ),
  call('stopAdRequest', `mutation E2eStopAd($id: ID!) { stopAdRequest(id: $id) { __typename } }`, { id: NO_ID }),
  call('deleteAdRequest', `mutation E2eDeleteAd($id: ID!) { deleteAdRequest(id: $id) }`, { id: NO_ID }),
];

describe('API · An ads manager submits, Marketing reviews', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('ADS-01 ADS_MANAGER reads its own ads dashboard, empty for an account that never submitted', () => {
    asRole('ADS_MANAGER', (token) => {
      expectRead<{ total: number; pending: number }>(token, MY_DASHBOARD).then((dashboard) => {
        expect(dashboard.total, 'ads this account submitted').to.equal(0);
        expect(dashboard.pending, 'ads awaiting review').to.equal(0);
      });
    });
  });

  it('ADS-02 ADS_MANAGER is refused the review queue, approving, stopping and deleting ads', () => {
    asRole('ADS_MANAGER', (token) => expectCallsRefused(token, REVIEW_CALLS));
  });
});
