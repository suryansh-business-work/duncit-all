/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { call, CALLS, expectRolesRefused, NO_ID } from '../../../support/api-staff';

/**
 * Coupons — the platform's offer codes are read and written by SUPER_ADMIN,
 * CITY_ADMIN, ZONAL_ADMIN, FINANCE_MANAGER and MARKETING_MANAGER
 * (finance/coupon/coupon.resolver.ts ADMIN_RW, before input validation and any
 * lookup). Venue-owned food coupons are a separate venue-owner path and are not
 * covered here. Scenario map: Staff › Coupons "Only coupon roles can create or
 * edit coupons".
 */

const REFUSED: readonly E2eStaffRole[] = ['SUPPORT_USER', 'COMMUNICATIONS_MANAGER', 'FINANCE_USER'];

const COUPON_CALLS = [
  call('couponsTable', `query E2eCoupons { couponsTable(query: { page_size: 1 }) { total } }`),
  call(
    'createCoupon',
    `mutation E2eCreateCoupon { createCoupon(input: { code: "E2ENEVER", discount_pct: 1, scope: GLOBAL }) { __typename } }`,
  ),
  call('updateCoupon', `mutation E2eUpdateCoupon($id: ID!) { updateCoupon(id: $id, input: {}) { __typename } }`, {
    id: NO_ID,
  }),
  CALLS.deleteCoupon,
];

describe('API · Coupons are for the coupon roles', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(REFUSED);
  });

  it('CP-01 SUPPORT_USER, COMMUNICATIONS_MANAGER and FINANCE_USER are refused listing, creating, editing and deleting coupons', () => {
    expectRolesRefused(REFUSED, COUPON_CALLS);
  });
});
