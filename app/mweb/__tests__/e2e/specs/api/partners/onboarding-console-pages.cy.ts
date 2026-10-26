/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectEachRefused, expectPage, expectPortalOpens, expectPortalRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The Onboarding console (onboarding.duncit.com) — its sign-in is gated to
 * ONBOARDING_MANAGER (portals/portal.constants.ts), its meeting desk, host
 * requests and settings to the onboarding desk (survey/meeting.resolver.ts
 * ONBOARDING_RW, crm/hostRequest ONBOARDING_REVIEW), and its review lists read
 * the directory tables the desk governs (portals/console-access.ts).
 * Scenario map: Partners › Access & navigation, Onboarding meetings, Host
 * requests, Host review, Venue review, Club admin review, Onboarding settings.
 */

const DESK = [
  ['onboardingMeetingsTable', `query E2eObMeetings { onboardingMeetingsTable(query: { page_size: 1 }) { total } }`],
  ['hostRequestsTable', `query E2eObHostRequests { hostRequestsTable(query: { page_size: 1 }) { total } }`],
] as const;
const REVIEW_LISTS = [
  ['hostsTable', `query E2eObHosts { hostsTable(query: { page_size: 1 }) { total } }`],
  ['venuesTable', `query E2eObVenues { venuesTable(query: { page_size: 1 }) { total } }`],
  ['clubAdminProfilesTable', `query E2eObClubAdmins { clubAdminProfilesTable(query: { page_size: 1 }) { total } }`],
] as const;
const REMOVE_HOLIDAY = `mutation E2eObRemoveHoliday($id: ID!) { removeMeetingHoliday(id: $id) }`;

describe('API · The Onboarding console opens for the onboarding desk only', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ALL_HOSTS_ACCESS', 'ONBOARDING_MANAGER']);
  });

  it('OCP-01 a member cannot sign in to the Onboarding console or read its desk', () => {
    expectPortalRefused('onboarding');
    DESK.forEach(([field, query]) => {
      expectEachRefused(field, query, {}, [
        [null, SIGNED_OUT],
        [memberToken, ACCESS_DENIED],
      ]);
    });
  });

  it('OCP-02 a directory console role (ALL_HOSTS_ACCESS) cannot sign in, read the desk or change its settings', () => {
    signInRunAs(['ALL_HOSTS_ACCESS']).then((token) => {
      expectPortalRefused('onboarding');
      DESK.forEach(([field, query]) => expectEachRefused(field, query, {}, [[token, ACCESS_DENIED]]));
      expectEachRefused('removeMeetingHoliday', REMOVE_HOLIDAY, { id: NO_ID }, [[token, ACCESS_DENIED]]);
    });
    revokeRunRoles(['ALL_HOSTS_ACCESS']);
  });

  it('OCP-03 ONBOARDING_MANAGER signs in and reads the desk and every review list', () => {
    signInRunAs(['ONBOARDING_MANAGER']).then((token) => {
      expectPortalOpens('onboarding');
      [...DESK, ...REVIEW_LISTS].forEach(([field, query]) => {
        cy.gqlRaw(query, {}, { token }).then((body) => expectPage(field, body));
      });
    });
  });
});
