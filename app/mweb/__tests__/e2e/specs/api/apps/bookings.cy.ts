/// <reference types="cypress" />
import { AUTH_REQUIRED, expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectAnswer, foreignPod, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Bookings — a member opens only their own booking, ticket and backout.
 * Scenario map: Apps › Bookings ("A member cannot open another member's
 * booking, ticket or backout").
 *
 * podMember.service.ts getBookingForUser answers an id no booking has with
 * "Booking not found" (someone else's is "You are not authorized to view this
 * booking."); ticket.service.ts pdfBase64 loads the ticket before the owner
 * check; findCancellableRequest looks the backout up by the pod AND the caller,
 * so a backout of someone else's answers exactly like a missing one ("That
 * backout is not yours"). That last call is aimed at a PAID pod on purpose: on
 * a free pod "Keep My Spot" means joining it again.
 */

const BOOKING_NOT_FOUND = refusal('NOT_FOUND', 'Booking not found');

const BOOKING = `query E2eBookingDetail($id: ID!) { bookingDetail(booking_id: $id) { id } }`;
const TICKET_PDF = `query E2eTicketPdf($id: ID!) { eventTicketPdfBase64(ticket_doc_id: $id) }`;
const KEEP_SPOT = `mutation E2eKeepMySpot($pod: ID!, $backout: ID) {
  cancelBackoutPod(pod_doc_id: $pod, backout_id: $backout) { id }
}`;
const STATE = `query E2eMembershipState($pod: ID!) { podMembershipState(pod_doc_id: $pod) { is_member status my_seats } }`;
const REDEEM = `mutation E2eRedeemPodReferral($token: String!) { redeemPodReferral(token: $token) { id } }`;
const LOOKUP = `query E2eReferralLookup($token: String!) { referralLookup(token: $token) { id } }`;

describe('API · A booking, its ticket and its backout are the member’s own', { testIsolation: false }, () => {
  let memberToken = '';
  let paidPodId = '';
  const unknownReferral = `e2e-no-such-referral-${NO_ID}`;

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      memberId(token).then((id) =>
        foreignPod(token, id, 'PAID').then((pod) => {
          paidPodId = pod.id;
        }),
      );
    });
  });

  it('BK-01 a booking that is not the member’s does not open, and nothing opens signed out', () => {
    cy.gqlRaw(BOOKING, { id: NO_ID }, { token: null }).then((body) => expectRefused('bookingDetail', body, AUTH_REQUIRED));
    cy.gqlRaw(BOOKING, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('bookingDetail', body, BOOKING_NOT_FOUND),
    );
    cy.gqlRaw(BOOKING, { id: 'not-a-booking' }, { token: memberToken }).then((body) =>
      expectRefused('bookingDetail', body, BOOKING_NOT_FOUND),
    );
  });

  it('BK-02 a ticket that is not the member’s cannot be downloaded', () => {
    cy.gqlRaw(TICKET_PDF, { id: NO_ID }, { token: null }).then((body) =>
      expectRefused('eventTicketPdfBase64', body, SIGNED_OUT),
    );
    cy.gqlRaw(TICKET_PDF, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('eventTicketPdfBase64', body, refusal('NOT_FOUND', 'Ticket not found')),
    );
  });

  it('BK-03 a backout that is not the member’s cannot be kept or undone', () => {
    cy.gqlRaw(KEEP_SPOT, { pod: paidPodId, backout: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('cancelBackoutPod', body, refusal('NOT_FOUND', 'That backout is not yours')),
    );
  });

  it("BK-04 someone else's pod shows the member as not booked", () => {
    cy.gqlRaw(STATE, { pod: paidPodId }, { token: memberToken }).then((body) =>
      expectAnswer('podMembershipState', body, { is_member: false, status: null, my_seats: 0 }),
    );
  });

  it('BK-05 a referral link that does not exist books nothing', () => {
    cy.gqlRaw(LOOKUP, { token: unknownReferral }, { token: null }).then((body) =>
      expectAnswer('referralLookup', body, null),
    );
    cy.gqlRaw(REDEEM, { token: unknownReferral }, { token: memberToken }).then((body) =>
      expectRefused('redeemPodReferral', body, refusal('NOT_FOUND', 'Invalid referral link')),
    );
  });
});
