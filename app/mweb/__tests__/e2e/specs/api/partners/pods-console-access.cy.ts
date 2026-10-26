/// <reference types="cypress" />
import { itRefusesStaffOperations, signInRunMember } from '../../../support/access-steps';

/**
 * Pods — the server refuses its operations (idea moderation, the pod dashboard, delete and hide) to a signed-out caller
 * and to a member. Scenario map: Partners › Pod ideas moderation; operations listed in
 * support/staff-operations.ts.
 */
describe('API · Pods refuses members and signed-out callers', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  itRefusesStaffOperations('Pods', () => memberToken);
});
