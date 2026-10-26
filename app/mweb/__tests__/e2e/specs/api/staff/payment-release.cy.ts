/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import {
  asRole,
  call,
  CALLS,
  expectCallsRefused,
  expectTableRead,
  NO_ID,
  OUT_OF_SCOPE,
} from '../../../support/api-staff';

/**
 * Finance › Payment Release — raising a release request takes ADMIN_POD
 * (SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, FINANCE_MANAGER) and then the pod's
 * city/zone scope; reviewing and approving take ADMIN_RW (SUPER_ADMIN,
 * CITY_ADMIN, FINANCE_MANAGER) (finance/finance/finance.resolver.ts,
 * finance/financeScope.ts). Every id below names no pod and no request, so
 * nothing can be raised or paid. Scenario map: Staff › Payment Release
 * "ZONAL_ADMIN can raise a release request but not approve it", and the
 * FINANCE_USER row of "Double or concurrent approval".
 */

const ROLES: readonly E2eStaffRole[] = ['ZONAL_ADMIN', 'FINANCE_USER'];

const RAISE = call(
  'createPaymentReleaseRequest',
  `mutation E2eRaiseRelease($pod: ID!) {
    createPaymentReleaseRequest(input: { pod_id: $pod, kind: VENUE_BILLING, amount_requested: 1 }) { __typename }
  }`,
  { pod: NO_ID },
);
const REQUESTS = call(
  'paymentReleaseRequestsTable',
  `query E2eReleaseRequests { paymentReleaseRequestsTable(query: { page_size: 1 }) { total } }`,
);

describe('API · Payment release: who raises, who approves', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('PR-01 ZONAL_ADMIN passes the raise gate and is then held to its zones: a pod in none of them is refused', () => {
    // Not "Access Denied": the role check passed, and the zone check (no zones assigned) turned it away.
    asRole('ZONAL_ADMIN', (token) => expectCallsRefused(token, [RAISE], OUT_OF_SCOPE));
  });

  it('PR-02 ZONAL_ADMIN is refused reviewing and approving releases', () => {
    asRole('ZONAL_ADMIN', (token) => {
      expectCallsRefused(token, [CALLS.reviewPaymentReleaseRequest, CALLS.approvePodPaymentRelease]);
    });
  });

  it('PR-03 FINANCE_USER reads the release requests but is refused raising, reviewing and approving', () => {
    asRole('FINANCE_USER', (token) => {
      expectTableRead(token, REQUESTS);
      expectCallsRefused(token, [RAISE, CALLS.reviewPaymentReleaseRequest, CALLS.approvePodPaymentRelease]);
    });
  });
});
