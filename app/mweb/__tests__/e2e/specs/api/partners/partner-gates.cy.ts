/// <reference types="cypress" />
import { AUTH_REQUIRED, expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Partner gates — the host, venue-owner and club-admin operations check the
 * caller's partnership in the service, not by role, so a member reaches them
 * and must be turned away with the partner refusal. Scenario map: Apps ›
 * Venue Studio / Host - manage pods, Partners › Club slot requests.
 */

const NEARBY_VENUES = `query E2eNearbyVenues($search: NearbyPartnerSearchInput!) {
  nearbyVenuesForHost(search: $search) { __typename }
}`;
const NEARBY_HOSTS = `query E2eNearbyHosts($venue_id: ID!, $search: NearbyPartnerSearchInput!) {
  nearbyHostsForVenue(venue_id: $venue_id, search: $search) { __typename }
}`;
const CLUB_HOST_SEARCH = `query E2eClubAdminHostSearch { clubAdminHostSearch(search: "a") { __typename } }`;
const WITHDRAW_HOST = `mutation E2eWithdrawHostApplication { withdrawHostApplication { __typename } }`;

describe('API · Partner gates refuse a member', { testIsolation: false }, () => {
  let memberToken = '';
  const search = { location_id: NO_ID };

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('PG-01 a member cannot search venues as a host: host access is required', () => {
    cy.gqlRaw(NEARBY_VENUES, { search }, { token: null }).then((body) =>
      expectRefused('nearbyVenuesForHost', body, SIGNED_OUT),
    );
    cy.gqlRaw(NEARBY_VENUES, { search }, { token: memberToken }).then((body) =>
      expectRefused('nearbyVenuesForHost', body, {
        code: 'FORBIDDEN',
        message: 'Host access is required before creating pods',
      }),
    );
  });

  it('PG-02 a member cannot search hosts for a venue they do not own', () => {
    // The lookup filters by id AND owner, so a missing venue and someone else's answer alike.
    cy.gqlRaw(NEARBY_HOSTS, { venue_id: NO_ID, search }, { token: null }).then((body) =>
      expectRefused('nearbyHostsForVenue', body, SIGNED_OUT),
    );
    cy.gqlRaw(NEARBY_HOSTS, { venue_id: NO_ID, search }, { token: memberToken }).then((body) =>
      expectRefused('nearbyHostsForVenue', body, { code: 'FORBIDDEN', message: 'Not your venue' }),
    );
  });

  it('PG-03 a member who administers no club cannot search hosts to assign', () => {
    cy.gqlRaw(CLUB_HOST_SEARCH, {}, { token: null }).then((body) =>
      expectRefused('clubAdminHostSearch', body, SIGNED_OUT),
    );
    cy.gqlRaw(CLUB_HOST_SEARCH, {}, { token: memberToken }).then((body) =>
      expectRefused('clubAdminHostSearch', body, { code: 'FORBIDDEN', message: 'You do not administer this club' }),
    );
  });

  it('PG-04 a member with no host application has nothing to withdraw', () => {
    cy.gqlRaw(WITHDRAW_HOST, {}, { token: null }).then((body) =>
      expectRefused('withdrawHostApplication', body, AUTH_REQUIRED),
    );
    cy.gqlRaw(WITHDRAW_HOST, {}, { token: memberToken }).then((body) =>
      expectRefused('withdrawHostApplication', body, { code: 'NOT_FOUND', message: 'Host application not found' }),
    );
  });
});
