/// <reference types="cypress" />
import { itRefusesStaffOperations, signInRunMember } from '../../../support/access-steps';

/**
 * Venues — the server refuses its operations (the venue list, approval and activation) to a signed-out caller
 * and to a member. Scenario map: Partners › Venue editor; operations listed in
 * support/staff-operations.ts.
 */
describe('API · Venues refuses members and signed-out callers', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  itRefusesStaffOperations('Venues', () => memberToken);
});
