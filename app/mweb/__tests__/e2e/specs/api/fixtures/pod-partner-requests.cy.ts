/// <reference types="cypress" />
import { expectRefused, revokeRunRoles, signInRunAs } from '../../../support/access-steps';
import { expectAnswer, foreignVenueId, refusal } from '../../../support/api-apps';
import { ensurePartner, signInRunPartner, type FixtureWorld } from '../../../support/fixture-world';

/**
 * Pod Requests between the run's own host and its own venue — the only pair a
 * single account can be both sides of. Scenario map: Apps › Pod partner
 * requests ("Request limit set at onboarding is enforced"); Partners › Pod
 * partner requests.
 *
 * podPartnerRequest.service.ts send: the venue must be live, the host active,
 * and the two must be different people — checked before the month's allowance
 * is touched. quota.ts reserveMonthlyRequest refuses outright once the limit
 * the onboarding desk set (setHostVenueRequestLimit / setVenueHostRequestLimit,
 * ONBOARDING_MANAGER) is used up — a limit of 0 refuses the first send, before
 * any request is written. The one send aimed at somebody else's venue is that
 * refused one; the limits are put back to the default before the spec ends.
 * A real request needs a second account, which a run does not have.
 */

const SEND = `mutation E2eFixturePprSend($input: SendPodPartnerRequestInput!) { sendPodPartnerRequest(input: $input) { id } }`;
const QUOTA = `query E2eFixturePprQuota($side: PartnerSide!, $venue: ID) {
  podPartnerRequestQuota(side: $side, venue_id: $venue) { limit used remaining }
}`;
const LIST = `query E2eFixturePprList($side: PartnerSide!, $venue: ID) {
  myPodPartnerRequests(side: $side, venue_id: $venue) { id }
}`;
const HOST_LIMIT = `mutation E2eFixtureHostLimit($id: ID!, $limit: Int) {
  setHostVenueRequestLimit(host_doc_id: $id, limit: $limit) { venue_requests_limit_override }
}`;
const VENUE_LIMIT = `mutation E2eFixtureVenueLimit($id: ID!, $limit: Int) {
  setVenueHostRequestLimit(venue_doc_id: $id, limit: $limit) { host_requests_limit_override }
}`;

const SELF_PAIR = refusal('BAD_USER_INPUT', 'A venue cannot send a Pod Request to its own owner');

interface Quota {
  limit: number;
  used: number;
  remaining: number;
}

describe('API · Pod Requests: the run’s host and venue, and their allowances', { testIsolation: false }, () => {
  let token = '';
  let world: Omit<FixtureWorld, 'pod'>;
  let defaults: { host: Quota; venue: Quota };

  const quota = (side: 'HOST' | 'VENUE') =>
    cy.gql<{ podPartnerRequestQuota: Quota }>(QUOTA, { side, venue: side === 'VENUE' ? world.venue.id : null }, { token });

  /** Set both allowances with ONBOARDING_MANAGER, then hand the role back. */
  const setLimits = (limit: number | null) => {
    signInRunAs(['ONBOARDING_MANAGER']).then((staff) => {
      cy.gqlRaw(HOST_LIMIT, { id: world.host.id, limit }, { token: staff }).then((body) =>
        expectAnswer('setHostVenueRequestLimit', body, { venue_requests_limit_override: limit }),
      );
      cy.gqlRaw(VENUE_LIMIT, { id: world.venue.id, limit }, { token: staff }).then((body) =>
        expectAnswer('setVenueHostRequestLimit', body, { host_requests_limit_override: limit }),
      );
    });
    revokeRunRoles(['ONBOARDING_MANAGER']);
  };

  before(() => {
    signInRunPartner().then((partner) => {
      ensurePartner(partner).then((built) => {
        world = built;
      });
    });
    signInRunPartner().then((partner) => {
      token = partner;
    });
  });

  it('PPR-01 the run’s host and venue cannot ask each other, in either direction', () => {
    const toVenue = { direction: 'HOST_TO_VENUE', venue_id: world.venue.id };
    const toHost = { direction: 'VENUE_TO_HOST', venue_id: world.venue.id, host_user_id: world.userId };
    cy.gqlRaw(SEND, { input: toVenue }, { token }).then((body) => expectRefused('sendPodPartnerRequest', body, SELF_PAIR));
    cy.gqlRaw(SEND, { input: toHost }, { token }).then((body) => expectRefused('sendPodPartnerRequest', body, SELF_PAIR));
  });

  it('PPR-02 a new partner starts the month with its whole allowance, and nothing was written', () => {
    quota('HOST').then(({ podPartnerRequestQuota }) => {
      expect(podPartnerRequestQuota.used, 'host used').to.equal(0);
      expect(podPartnerRequestQuota.remaining, 'host remaining').to.equal(podPartnerRequestQuota.limit);
      expect(podPartnerRequestQuota.limit, 'host limit').to.be.greaterThan(0);
    });
    quota('VENUE').then(({ podPartnerRequestQuota }) => {
      expect(podPartnerRequestQuota.used, 'venue used').to.equal(0);
      expect(podPartnerRequestQuota.remaining, 'venue remaining').to.equal(podPartnerRequestQuota.limit);
    });
    quota('HOST').then(({ podPartnerRequestQuota: host }) =>
      quota('VENUE').then(({ podPartnerRequestQuota: venue }) => {
        defaults = { host, venue };
      }),
    );
    cy.gqlRaw(LIST, { side: 'HOST' }, { token }).then((body) => expectAnswer('myPodPartnerRequests', body, []));
    cy.gqlRaw(LIST, { side: 'VENUE', venue: world.venue.id }, { token }).then((body) =>
      expectAnswer('myPodPartnerRequests', body, []),
    );
  });

  it('PPR-03 another owner’s venue allowance is not the run’s to read', () => {
    foreignVenueId(token, world.userId).then((foreign) => {
      cy.gqlRaw(QUOTA, { side: 'VENUE', venue: foreign }, { token }).then((body) =>
        expectRefused('podPartnerRequestQuota', body, refusal('FORBIDDEN', 'Not your venue')),
      );
    });
  });

  it('PPR-04 a limit of 0 set at onboarding empties the allowance and refuses the next send', () => {
    setLimits(0);
    quota('HOST').then(({ podPartnerRequestQuota }) =>
      expect(podPartnerRequestQuota, 'host allowance').to.deep.equal({ limit: 0, used: 0, remaining: 0 }),
    );
    quota('VENUE').then(({ podPartnerRequestQuota }) =>
      expect(podPartnerRequestQuota, 'venue allowance').to.deep.equal({ limit: 0, used: 0, remaining: 0 }),
    );
    foreignVenueId(token, world.userId).then((foreign) => {
      cy.gqlRaw(SEND, { input: { direction: 'HOST_TO_VENUE', venue_id: foreign } }, { token }).then((body) =>
        expectRefused(
          'sendPodPartnerRequest',
          body,
          refusal('LIMIT_REACHED', 'You have used all 0 requests for this month.'),
        ),
      );
    });
    cy.gqlRaw(LIST, { side: 'HOST' }, { token }).then((body) => expectAnswer('myPodPartnerRequests', body, []));
  });

  it('PPR-05 clearing the limit gives back the default allowance', () => {
    setLimits(null);
    quota('HOST').then(({ podPartnerRequestQuota }) =>
      expect(podPartnerRequestQuota, 'host allowance').to.deep.equal(defaults.host),
    );
    quota('VENUE').then(({ podPartnerRequestQuota }) =>
      expect(podPartnerRequestQuota, 'venue allowance').to.deep.equal(defaults.venue),
    );
  });
});
