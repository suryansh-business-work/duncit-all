/// <reference types="cypress" />
import { itRefusesStaffOperations, signInRunMember } from '../../../support/access-steps';

/**
 * Ecomm store console — the server refuses its operations (the ecomm.duncit.com store admin: orders, coupons, settings) to a
 * signed-out caller and to a member. Scenario map: Staff › Authentication and
 * Authorization rows; operations listed in support/staff-operations.ts.
 */
describe('API · Ecomm store console refuses members and signed-out callers', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  itRefusesStaffOperations('Ecomm store', () => memberToken);
});
