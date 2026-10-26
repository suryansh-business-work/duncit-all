/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { call, expectRolesRefused, NO_ID } from '../../../support/api-staff';

/**
 * Admin › Categories — category writes are SUPER_ADMIN and CITY_ADMIN only
 * (pods/category/category.resolver.ts ADMIN_WRITE, checked before the category
 * is looked up). Scenario map: Staff › Categories "Category writes refused for
 * other roles".
 */

const REFUSED: readonly E2eStaffRole[] = ['ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'];

const CATEGORY_WRITES = [
  call(
    'createCategory',
    `mutation E2eCreateCategory { createCategory(input: { name: "E2E never created", level: SUB }) { __typename } }`,
  ),
  call(
    'updateCategory',
    `mutation E2eUpdateCategory($id: ID!) { updateCategory(category_id: $id, input: {}) { __typename } }`,
    { id: NO_ID },
  ),
  call('deleteCategory', `mutation E2eDeleteCategory($id: ID!) { deleteCategory(category_id: $id) }`, { id: NO_ID }),
];

describe('API · Category writes are for super and city admins', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(REFUSED);
  });

  it('CT-01 ZONAL_ADMIN, SUPPORT_USER and FINANCE_USER are refused creating, editing and deleting categories', () => {
    expectRolesRefused(REFUSED, CATEGORY_WRITES);
  });
});
