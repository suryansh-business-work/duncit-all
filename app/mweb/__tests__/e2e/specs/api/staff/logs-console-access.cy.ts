/// <reference types="cypress" />
import { itRefusesStaffOperations, signInRunMember } from '../../../support/access-steps';

/**
 * Logs console — the server refuses its operations (telemetry, bugs and email logs) to a
 * signed-out caller and to a member. Scenario map: Staff › Authentication and
 * Authorization rows; operations listed in support/staff-operations.ts.
 */
describe('API · Logs console refuses members and signed-out callers', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  itRefusesStaffOperations('Logs', () => memberToken);
});
