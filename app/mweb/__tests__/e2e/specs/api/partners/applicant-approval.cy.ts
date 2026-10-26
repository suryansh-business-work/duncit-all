/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectEachRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Applicant approval (/meetings/:kind) — approving or denying an applicant's
 * meeting is the onboarding desk's (survey/meeting.resolver.ts `decideMeeting`,
 * ONBOARDING_RW). The decision needs written feedback, checked before the
 * meeting is even loaded (meeting.service.ts `decide`), so no call here can
 * decide a real applicant. Scenario map: Partners › Applicant approval.
 */

const DECIDE = `mutation E2eDecideMeeting($id: ID!, $feedback: String!) {
  decideMeeting(id: $id, decision: APPROVED, feedback: $feedback) { __typename }
}`;

describe('API · Only the onboarding desk decides an applicant', { testIsolation: false }, () => {
  let memberToken = '';
  let hostsStaffToken = '';
  let onboardingToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    signInRunAs(['ALL_HOSTS_ACCESS']).then((token) => {
      hostsStaffToken = token;
    });
    revokeRunRoles(['ALL_HOSTS_ACCESS']);
    signInRunAs(['ONBOARDING_MANAGER']).then((token) => {
      onboardingToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ONBOARDING_MANAGER']);
  });

  it('AA-01 deciding a meeting is refused signed out, to a member and to a directory console role', () => {
    expectEachRefused('decideMeeting', DECIDE, { id: NO_ID, feedback: 'e2e' }, [
      [null, SIGNED_OUT],
      [memberToken, ACCESS_DENIED],
      [hostsStaffToken, ACCESS_DENIED],
    ]);
  });

  it('AA-02 a decision without feedback is refused before the meeting is looked up', () => {
    expectEachRefused('decideMeeting', DECIDE, { id: NO_ID, feedback: '   ' }, [
      [onboardingToken, { code: 'BAD_USER_INPUT', message: 'Add your feedback before deciding' }],
    ]);
  });

  it('AA-03 a decision on a meeting that does not exist is refused', () => {
    expectEachRefused('decideMeeting', DECIDE, { id: NO_ID, feedback: 'e2e' }, [
      [onboardingToken, { code: 'NOT_FOUND', message: 'Meeting not found' }],
    ]);
  });
});
