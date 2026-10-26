/// <reference types="cypress" />
import { itRefusesStaffOperations, signInRunMember } from '../../../support/access-steps';

/**
 * Support console — the server refuses its operations (every member's tickets and reported problems) to a
 * signed-out caller and to a member. Scenario map: Staff › Authentication and
 * Authorization rows; operations listed in support/staff-operations.ts.
 */
describe('API · Support console refuses members and signed-out callers', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  itRefusesStaffOperations('Support', () => memberToken);
});
