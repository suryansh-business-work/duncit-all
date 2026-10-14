/// <reference types="cypress" />
import { itRefusesStaffOperations, signInRunMember } from '../../../support/access-steps';

/**
 * Communications console — the server refuses its operations (WhatsApp scenarios and email templates) to a
 * signed-out caller and to a member. Scenario map: Staff › Authentication and
 * Authorization rows; operations listed in support/staff-operations.ts.
 */
describe('API · Communications console refuses members and signed-out callers', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  itRefusesStaffOperations('Communications', () => memberToken);
});
