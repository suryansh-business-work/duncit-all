/// <reference types="cypress" />
import { signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectAnswer, expectEachRefused, foreignVenueId } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Pod partner requests (/venues/nearby-hosts, /host/nearby-venues) — a request
 * between a host and a venue is seen and moved only by those two parties
 * (venues/podPartnerRequest/podPartnerRequest.service.ts `sideOf`). Sending
 * one needs the venue as its owner, or an active host account; both checks run
 * before the monthly allowance is reserved or anything is written.
 * Scenario map: Partners › Pod partner requests.
 */

const LIST = `query E2ePartnerRequests($side: PartnerSide!) { myPodPartnerRequests(side: $side) { id } }`;
const ONE = `query E2ePartnerRequest($id: ID!) { podPartnerRequest(id: $id) { id } }`;
const RESPOND = `mutation E2eRespondPartnerRequest($id: ID!) { respondPodPartnerRequest(id: $id, accept: true) { id } }`;
const CANCEL = `mutation E2eCancelPartnerRequest($id: ID!) { cancelPodPartnerRequest(id: $id) { id } }`;
const SEND = `mutation E2eSendPartnerRequest($input: SendPodPartnerRequestInput!) { sendPodPartnerRequest(input: $input) { id } }`;
const QUOTA = `query E2ePartnerQuota($side: PartnerSide!, $venue_id: ID) {
  podPartnerRequestQuota(side: $side, venue_id: $venue_id) { remaining }
}`;

const REQUEST_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Request not found' };
const NOT_YOUR_VENUE: Refusal = { code: 'FORBIDDEN', message: 'Not your venue' };
const NOT_A_HOST: Refusal = { code: 'FORBIDDEN', message: 'Host access is required before creating pods' };

describe('API · Only the two parties see or move a pod partner request', { testIsolation: false }, () => {
  let memberToken = '';
  let foreignId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    foreignVenueId().then((id) => {
      foreignId = id;
    });
  });

  it('PR-01 a member who is party to no request lists none on either side', () => {
    expectEachRefused('myPodPartnerRequests', LIST, { side: 'HOST' }, [[null, SIGNED_OUT]]);
    ['HOST', 'VENUE'].forEach((side) => {
      cy.gqlRaw(LIST, { side }, { token: memberToken }).then((body) => expectAnswer('myPodPartnerRequests', body, []));
    });
  });

  it('PR-02 a request the caller is not party to cannot be read, answered or withdrawn', () => {
    [
      ['podPartnerRequest', ONE],
      ['respondPodPartnerRequest', RESPOND],
      ['cancelPodPartnerRequest', CANCEL],
    ].forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [
        [null, SIGNED_OUT],
        [memberToken, REQUEST_NOT_FOUND],
      ]);
    });
  });

  it('PR-03 a member cannot send a request on behalf of a venue they do not own', () => {
    // host_user_id names nobody: were the venue check ever to break, the host check still refuses.
    const input = { direction: 'VENUE_TO_HOST', venue_id: foreignId, host_user_id: NO_ID };
    expectEachRefused('sendPodPartnerRequest', SEND, { input }, [
      [null, SIGNED_OUT],
      [memberToken, NOT_YOUR_VENUE],
    ]);
  });

  it('PR-04 a member without host access cannot ask a venue for a pod', () => {
    const input = { direction: 'HOST_TO_VENUE', venue_id: foreignId };
    expectEachRefused('sendPodPartnerRequest', SEND, { input }, [[memberToken, NOT_A_HOST]]);
  });

  it('PR-05 the monthly allowance is the caller’s own: refused for a non-host and for a venue they do not own', () => {
    expectEachRefused('podPartnerRequestQuota', QUOTA, { side: 'HOST' }, [[memberToken, NOT_A_HOST]]);
    [foreignId, NO_ID].forEach((venueId) => {
      expectEachRefused('podPartnerRequestQuota', QUOTA, { side: 'VENUE', venue_id: venueId }, [
        [memberToken, NOT_YOUR_VENUE],
      ]);
    });
  });
});
