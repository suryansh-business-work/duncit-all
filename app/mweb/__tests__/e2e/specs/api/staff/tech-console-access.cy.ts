/// <reference types="cypress" />
import { itRefusesStaffOperations, signInRunMember } from '../../../support/access-steps';

/**
 * Tech console — the server refuses its operations (server, DNS, backups and the e2e settings) to a
 * signed-out caller and to a member. Scenario map: Staff › Authentication and
 * Authorization rows; operations listed in support/staff-operations.ts.
 */
describe('API · Tech console refuses members and signed-out callers', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  itRefusesStaffOperations('Tech', () => memberToken);
});
