/// <reference types="cypress" />
import { itRefusesStaffOperations, signInRunMember } from '../../../support/access-steps';

/**
 * E2E testing API — the server refuses its operations (held codes, traffic keys, Google stand-ins, purge and role grants) to a signed-out caller
 * and to a member. Scenario map: Tech › E2E Tests; operations listed in
 * support/staff-operations.ts.
 */
describe('API · E2E testing API refuses members and signed-out callers', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  itRefusesStaffOperations('E2E testing API', () => memberToken);
});
