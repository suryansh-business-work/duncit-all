/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectAnswer, foreignVenueId, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Pod partner requests — a request is read and moved only by its two parties,
 * and only a host or a venue's owner sends one. Scenario map: Apps › Pod
 * partner requests ("Third party cannot open or answer a request", "Request
 * limit set at onboarding is enforced", "Decline or withdraw a request").
 *
 * podPartnerRequest.service.ts loads the request and then asks which side the
 * caller is on (a third party is "This request is not yours"); an id no
 * request has is "Request not found". The lists are filtered by the caller.
 * Sending as a venue checks the venue's owner before anything is reserved or
 * written, and the allowance asks for host access or the venue's owner.
 */

const HOST_REQUIRED = refusal('FORBIDDEN', 'Host access is required before creating pods');
const NOT_YOUR_VENUE = refusal('FORBIDDEN', 'Not your venue');
const REQUEST_NOT_FOUND = refusal('NOT_FOUND', 'Request not found');

const MINE = `query E2eMyPartnerRequests($side: PartnerSide!) { myPodPartnerRequests(side: $side) { id } }`;
const ONE = `query E2ePartnerRequest($id: ID!) { podPartnerRequest(id: $id) { id } }`;
const RESPOND = `mutation E2eRespondPartner($id: ID!) { respondPodPartnerRequest(id: $id, accept: false) { id } }`;
const CANCEL = `mutation E2eCancelPartner($id: ID!) { cancelPodPartnerRequest(id: $id) { id } }`;
const QUOTA = `query E2ePartnerQuota($side: PartnerSide!, $venue: ID) {
  podPartnerRequestQuota(side: $side, venue_id: $venue) { __typename }
}`;
const SEND = `mutation E2eSendPartner($input: SendPodPartnerRequestInput!) { sendPodPartnerRequest(input: $input) { id } }`;

describe('API · Pod partner requests belong to their two parties', { testIsolation: false }, () => {
  let memberToken = '';
  let venueId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      memberId(token).then((id) =>
        foreignVenueId(token, id).then((venue) => {
          venueId = venue;
        }),
      );
    });
  });

  it('PR-01 a member who is neither host nor owner has no requests on either side', () => {
    cy.gqlRaw(MINE, { side: 'HOST' }, { token: null }).then((body) =>
      expectRefused('myPodPartnerRequests', body, SIGNED_OUT),
    );
    cy.gqlRaw(MINE, { side: 'HOST' }, { token: memberToken }).then((body) =>
      expectAnswer('myPodPartnerRequests', body, []),
    );
    cy.gqlRaw(MINE, { side: 'VENUE' }, { token: memberToken }).then((body) =>
      expectAnswer('myPodPartnerRequests', body, []),
    );
  });

  it('PR-02 a request that is not the member’s can be neither opened, answered nor withdrawn', () => {
    cy.gqlRaw(ONE, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('podPartnerRequest', body, REQUEST_NOT_FOUND),
    );
    cy.gqlRaw(RESPOND, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('respondPodPartnerRequest', body, REQUEST_NOT_FOUND),
    );
    cy.gqlRaw(CANCEL, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('cancelPodPartnerRequest', body, REQUEST_NOT_FOUND),
    );
    cy.gqlRaw(ONE, { id: 'not-a-request' }, { token: memberToken }).then((body) =>
      expectRefused('podPartnerRequest', body, refusal('BAD_USER_INPUT', 'Invalid request id')),
    );
  });

  it('PR-03 the monthly allowance is a host’s or a venue owner’s to read', () => {
    cy.gqlRaw(QUOTA, { side: 'HOST' }, { token: memberToken }).then((body) =>
      expectRefused('podPartnerRequestQuota', body, HOST_REQUIRED),
    );
    cy.gqlRaw(QUOTA, { side: 'VENUE', venue: venueId }, { token: memberToken }).then((body) =>
      expectRefused('podPartnerRequestQuota', body, NOT_YOUR_VENUE),
    );
  });

  it("PR-04 a member cannot send a request in the name of another owner's venue", () => {
    // The host named is no host, so even a broken owner check would stop before a request is written.
    const input = { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: NO_ID };
    cy.gqlRaw(SEND, { input }, { token: memberToken }).then((body) =>
      expectRefused('sendPodPartnerRequest', body, NOT_YOUR_VENUE),
    );
  });
});
