/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { type Refusal, revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import {
  asRole,
  CALLS,
  expectCallsRefused,
  OUT_OF_CITY,
  OUT_OF_SCOPE,
} from '../../../support/api-staff';

/**
 * Staff › City scope. CITY_ADMIN and ZONAL_ADMIN pass the money-write gates,
 * but finance/financeScope.ts holds them to their city / zones and fails
 * closed: a pod, payment, withdrawal or coupon nobody can place in the
 * admin's city is refused. The run account is granted the role with no
 * assigned city and no zones, so every money write must be turned away by
 * the scope check — never by "Access Denied", never reaching the write.
 *
 * The user directory (middleware/rbac.ts readScope / assertScope) fails closed
 * the same way: no city, no directory and no user edits.
 */

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'ZONAL_ADMIN'];

const ME_ID = `query E2eCityScopeMe { me { user_id } }`;
const OUT_OF_ZONE: Refusal = { code: 'FORBIDDEN', message: 'Out of zone scope' };

describe('API · City and zone scope on staff writes', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('CS-01 a CITY_ADMIN with no city is refused approving payouts, refunding, paying withdrawals and deleting coupons', () => {
    asRole('CITY_ADMIN', (token) => {
      expectCallsRefused(
        token,
        [CALLS.approvePodPaymentRelease, CALLS.refundPayment, CALLS.reviewWithdrawal, CALLS.deleteCoupon],
        OUT_OF_SCOPE,
      );
    });
  });

  it('CS-02 a ZONAL_ADMIN with no zones is refused deleting a coupon it cannot place in its zones', () => {
    asRole('ZONAL_ADMIN', (token) => expectCallsRefused(token, [CALLS.deleteCoupon], OUT_OF_SCOPE));
  });

  // readScope / assertScope (server/src/middleware/rbac.ts) fail closed for a city
  // admin with no city, as financeScope.ts does for CS-01. The edit targets the run
  // account itself — a real user — and its empty input passes validation, so the
  // refusal is the scope check's and nothing is written.
  it('CS-03 a CITY_ADMIN with no city is refused the user directory and editing a user', () => {
    asRole('CITY_ADMIN', (token) => {
      expectCallsRefused(token, [CALLS.usersTable], OUT_OF_CITY);
      cy.gql<{ me: { user_id: string } }>(ME_ID, {}, { token }).then((data) => {
        expectCallsRefused(token, [{ ...CALLS.updateUser, variables: { id: data.me.user_id } }], OUT_OF_CITY);
      });
    });
  });

  it('CS-04 a ZONAL_ADMIN with no zones is refused the user directory', () => {
    asRole('ZONAL_ADMIN', (token) => expectCallsRefused(token, [CALLS.usersTable], OUT_OF_ZONE));
  });
});
