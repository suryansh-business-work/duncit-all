/// <reference types="cypress" />
import { itRefusesStaffOperations, signInRunMember } from '../../../support/access-steps';

/**
 * Hosts — the server refuses its operations (the host list and host approval) to a signed-out caller
 * and to a member. Scenario map: Partners › Host pods; operations listed in
 * support/staff-operations.ts.
 */
describe('API · Hosts refuses members and signed-out callers', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  itRefusesStaffOperations('Hosts', () => memberToken);
});
