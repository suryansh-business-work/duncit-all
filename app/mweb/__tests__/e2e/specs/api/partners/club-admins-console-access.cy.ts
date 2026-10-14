/// <reference types="cypress" />
import { itRefusesStaffOperations, signInRunMember } from '../../../support/access-steps';

/**
 * Club admins — the server refuses its operations (club admin profiles, approval and the regional admin's region) to a signed-out caller
 * and to a member. Scenario map: Partners › Club slot requests; operations listed in
 * support/staff-operations.ts.
 */
describe('API · Club admins refuses members and signed-out callers', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  itRefusesStaffOperations('Club admins', () => memberToken);
});
