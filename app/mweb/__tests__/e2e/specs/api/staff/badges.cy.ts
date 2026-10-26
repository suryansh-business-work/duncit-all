/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { call, expectRolesRefused, NO_ID } from '../../../support/api-staff';

/**
 * Admin › Badges — badge writes are SUPER_ADMIN, CITY_ADMIN and ZONAL_ADMIN
 * (engagement/badge/badge.resolver.ts ADMIN_WRITE, checked before the badge is
 * looked up). Scenario map: Staff › Badges "Badge writes refused for support
 * users".
 */

const REFUSED: readonly E2eStaffRole[] = ['SUPPORT_USER', 'FINANCE_USER'];

const BADGE_WRITES = [
  call('updateBadge', `mutation E2eUpdateBadge($id: ID!) { updateBadge(badge_doc_id: $id, input: {}) { __typename } }`, {
    id: NO_ID,
  }),
  call('deleteBadge', `mutation E2eDeleteBadge($id: ID!) { deleteBadge(badge_doc_id: $id) }`, { id: NO_ID }),
];

describe('API · Badge writes are for super, city and zonal admins', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(REFUSED);
  });

  it('BG-01 SUPPORT_USER and FINANCE_USER are refused editing and deleting badges', () => {
    expectRolesRefused(REFUSED, BADGE_WRITES);
  });
});
