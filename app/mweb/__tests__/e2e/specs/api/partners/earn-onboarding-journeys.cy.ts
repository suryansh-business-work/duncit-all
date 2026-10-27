/// <reference types="cypress" />
import { signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectAnswer, expectEachRefused } from '../../../support/api-partners';

/**
 * Earn / onboarding journeys (/earn) — an onboarding meeting is moved or
 * cancelled by the member who booked it, found by THEIR id and the journey's
 * kind (survey/meeting.service.ts `rescheduleMyMeeting`, `cancelMyMeeting`),
 * so no call can reach somebody else's. The run account has booked no ECOMM
 * meeting, which the spec proves before relying on it.
 * Scenario map: Partners › Earn / onboarding journeys.
 */

const MY_MEETING = `query E2eMyEcommMeeting { myMeeting(kind: ECOMM) { __typename } }`;
const RESCHEDULE = `mutation E2eRescheduleMeeting($at: String!) {
  rescheduleMyMeeting(kind: ECOMM, requested_at: $at, reason: "e2e") { __typename }
}`;
const CANCEL = `mutation E2eCancelMeeting { cancelMyMeeting(kind: ECOMM, reason: "e2e") { __typename } }`;
const SLOTS = `query E2eMeetingSlots { meetingSlots(kind: ECOMM) { __typename } }`;

const MEETING_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Meeting not found' };
const SOON = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

describe('API · An onboarding meeting is moved only by the member who booked it', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('EJ-01 the journey’s meeting calls are refused signed out', () => {
    expectEachRefused('rescheduleMyMeeting', RESCHEDULE, { at: SOON() }, [[null, SIGNED_OUT]]);
    expectEachRefused('cancelMyMeeting', CANCEL, {}, [[null, SIGNED_OUT]]);
    expectEachRefused('meetingSlots', SLOTS, {}, [[null, SIGNED_OUT]]);
  });

  it('EJ-02 a member with no booked meeting has nothing to reschedule or cancel', () => {
    cy.gqlRaw(MY_MEETING, {}, { token: memberToken }).then((body) => expectAnswer('myMeeting', body, null));
    expectEachRefused('rescheduleMyMeeting', RESCHEDULE, { at: SOON() }, [[memberToken, MEETING_NOT_FOUND]]);
    expectEachRefused('cancelMyMeeting', CANCEL, {}, [[memberToken, MEETING_NOT_FOUND]]);
  });

  it('EJ-03 a reschedule without a new time is refused before anything is looked up', () => {
    expectEachRefused('rescheduleMyMeeting', RESCHEDULE, { at: '' }, [
      [memberToken, { code: 'BAD_USER_INPUT', message: 'A new date & time is required' }],
    ]);
  });
});
