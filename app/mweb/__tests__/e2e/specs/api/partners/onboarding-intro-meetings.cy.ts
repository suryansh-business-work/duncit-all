/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs, signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectEachRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Onboarding › Settings (the onboarding intro, survey/onboardingIntro) and the
 * meeting writes behind the Meeting Schedule Queues and the Schedule / Cancel
 * dialogs (survey/meeting.resolver.ts). The intro is readable by any signed-in
 * user — the app shows it mid-onboarding — and writable only by SURVEY_RW
 * (SUPER_ADMIN, ONBOARDING_MANAGER); updateMeeting and cancelMeeting are
 * ONBOARDING_RW.
 *
 * Every meeting is a real applicant's and the intro is the one every applicant
 * reads, so nothing is changed: the refused writes carry an id no meeting has
 * or an input the gate stops first, the desk's own writes are aimed at a
 * meeting nobody has (or stopped by the reason rule, which runs before any
 * lookup), and the intro is read back unchanged.
 *
 * Scenario map: Onboarding › Onboarding Settings, Meeting Schedule Queues,
 * Scheduling Meetings ("Cancel or reject a meeting with a reason").
 */

const INTRO = `query E2eObIntro { onboardingIntro {
  host_intro_html venue_intro_html ecomm_intro_html club_admin_intro_html
  social_handles { x_url instagram_url youtube_url facebook_url website_url }
} }`;
const UPDATE_INTRO = `mutation E2eObUpdateIntro { updateOnboardingIntro(input: {}) { host_intro_html } }`;
const UPDATE_MEETING = `mutation E2eObUpdateMeeting($id: ID!) { updateMeeting(id: $id, input: { notes: "e2e" }) { id } }`;
const CANCEL_MEETING = `mutation E2eObCancelMeeting($id: ID!, $reason: String!) { cancelMeeting(id: $id, reason: $reason) { id } }`;

const MEETING_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Meeting not found' };

describe('API · The onboarding intro is read by applicants and changed by the desk; meeting writes are the desk’s', { testIsolation: false }, () => {
  let memberToken = '';
  let intro: unknown;

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      cy.gql<{ onboardingIntro: unknown }>(INTRO, {}, { token }).then((data) => {
        intro = data.onboardingIntro;
      });
    });
  });

  after(() => {
    revokeRunRoles(['ALL_VENUES_ACCESS', 'CITY_ADMIN', 'ONBOARDING_MANAGER']);
  });

  it('OIM-01 the intro is refused signed out and read by a plain member mid-onboarding', () => {
    expectEachRefused('onboardingIntro', INTRO, {}, [[null, SIGNED_OUT]]);
    expect(intro, 'a member reads the intro (before())').to.be.an('object');
  });

  it('OIM-02 a member, CITY_ADMIN and a directory seat cannot change the intro or touch a meeting, and the intro is unchanged', () => {
    const refuseAll = (token: string) => {
      expectEachRefused('updateOnboardingIntro', UPDATE_INTRO, {}, [[token, ACCESS_DENIED]]);
      expectEachRefused('updateMeeting', UPDATE_MEETING, { id: NO_ID }, [[token, ACCESS_DENIED]]);
      expectEachRefused('cancelMeeting', CANCEL_MEETING, { id: NO_ID, reason: 'e2e' }, [[token, ACCESS_DENIED]]);
    };
    refuseAll(memberToken);
    expectEachRefused('cancelMeeting', CANCEL_MEETING, { id: NO_ID, reason: 'e2e' }, [[null, SIGNED_OUT]]);
    signInRunAs(['CITY_ADMIN']).then(refuseAll);
    revokeRunRoles(['CITY_ADMIN']);
    signInRunAs(['ALL_VENUES_ACCESS']).then(refuseAll);
    revokeRunRoles(['ALL_VENUES_ACCESS']);
    cy.gql<{ onboardingIntro: unknown }>(INTRO, {}, { token: memberToken }).then(({ onboardingIntro }) =>
      expect(onboardingIntro, 'the intro every applicant reads').to.deep.equal(intro),
    );
  });

  it('OIM-03 the desk must give a reason before a meeting is cancelled, and a meeting nobody has cannot be changed', () => {
    signInRunAs(['ONBOARDING_MANAGER']).then((token) => {
      expectEachRefused('cancelMeeting', CANCEL_MEETING, { id: NO_ID, reason: '   ' }, [
        [token, { code: 'BAD_USER_INPUT', message: 'A cancellation reason is required' }],
      ]);
      expectEachRefused('cancelMeeting', CANCEL_MEETING, { id: NO_ID, reason: 'e2e reason' }, [[token, MEETING_NOT_FOUND]]);
      expectEachRefused('updateMeeting', UPDATE_MEETING, { id: NO_ID }, [[token, MEETING_NOT_FOUND]]);
    });
    revokeRunRoles(['ONBOARDING_MANAGER']);
  });
});
