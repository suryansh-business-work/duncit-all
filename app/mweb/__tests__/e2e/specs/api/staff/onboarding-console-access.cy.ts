/// <reference types="cypress" />
import { itRefusesStaffOperations, signInRunMember } from '../../../support/access-steps';

/**
 * Onboarding — the server refuses its operations (host requests, meetings and identity verifications) to a signed-out caller
 * and to a member. Scenario map: Partners › Applicant approval; operations listed in
 * support/staff-operations.ts.
 */
describe('API · Onboarding refuses members and signed-out callers', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  itRefusesStaffOperations('Onboarding', () => memberToken);
});
