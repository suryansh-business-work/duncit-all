/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectRead, expectRolesRefused, NO_ID } from '../../../support/api-staff';

/**
 * Admin › Membership — tiers and benefits are read and written by SUPER_ADMIN
 * and CITY_ADMIN only (engagement/membership/membership.resolver.ts
 * ADMIN_WRITE, first statement of every admin field). Scenario map: Staff ›
 * Membership "Membership writes refused for other roles".
 */

const REFUSED: readonly E2eStaffRole[] = ['ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'];
const ROLES: readonly E2eStaffRole[] = [...REFUSED, 'CITY_ADMIN'];

const PLANS = call('membershipPlans', `query E2eMembershipPlans { membershipPlans { key } }`);
const PLAN_WRITES = [
  call(
    'updateMembershipPlan',
    `mutation E2eUpdateMembershipPlan($id: ID!) { updateMembershipPlan(plan_id: $id, input: {}) { __typename } }`,
    { id: NO_ID },
  ),
  call('deleteMembershipPlan', `mutation E2eDeleteMembershipPlan($id: ID!) { deleteMembershipPlan(plan_id: $id) }`, {
    id: NO_ID,
  }),
];

describe('API · Membership tiers are for super and city admins', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('MB-01 ZONAL_ADMIN, SUPPORT_USER and FINANCE_USER are refused reading, editing and deleting tiers', () => {
    expectRolesRefused(REFUSED, [PLANS, ...PLAN_WRITES]);
  });

  it('MB-02 CITY_ADMIN reads the tiers, each with its key', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead<Array<{ key: string }>>(token, PLANS).then((plans) => {
        expect(plans, 'membership tiers').to.be.an('array');
        plans.forEach((plan) => expect(plan.key, 'tier key').to.be.a('string').and.not.be.empty);
      });
    });
  });
});
