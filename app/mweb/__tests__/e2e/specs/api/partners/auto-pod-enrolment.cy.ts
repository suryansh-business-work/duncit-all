/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectAnswer, expectEachRefused, foreignVenueId } from '../../../support/api-partners';
import { asRole, call, expectCallsRefused, expectRead } from '../../../support/api-staff';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Auto Pods from the partners' side — a venue accepting one, a club claiming
 * one, a club admin opening one for their club — and who may open or edit an
 * offer in the Pods console, for a member who owns no venue and runs no club.
 *
 * pods/autoPod/autoPod.resolver.ts + autoPod.claims.ts + autoPod.service.ts:
 * - the venue and club queues are scoped inside the service to the caller's
 *   own approved venues / clubs, so a member reads none, and naming another
 *   owner's venue narrows to nothing;
 * - accepting needs the new offer terms (a window and a price): a call without
 *   them — and the old slot picker query — answers the update-the-app message;
 * - a club claim, and an Auto Pod opened for a club, check the caller
 *   administers that club FIRST ("You do not administer this club");
 * - withdrawing loads the offer first ("Auto Pod not found");
 * - one offer is readable by the Pods console (ALL_PODS_ACCESS) and by whoever
 *   enrolled on it; anyone else is told it does not exist;
 * - rolling out or editing a marketplace offer, and its audience counts, are
 *   ADMIN_WRITE (SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN) — the Pods console role
 *   included in the refusal.
 *
 * Nothing is accepted, claimed, opened or withdrawn: every call is refused
 * before it writes. Scenario map: Partners › Venue Auto Pods ("No approved
 * venues or no category", "Pinned offer…"/"Another venue accepted first" —
 * their refusals), Partners › Club Admin Auto Pods ("Claim an Auto Pod for a
 * club", "Withdraw a club claim" — refusals), Pods Portal › Auto Pod Editor &
 * Details ("Read the auto pod details page" — unknown id; who may roll out).
 */

const UPDATE_APP = 'Auto Pods are accepted with a time and a price now. Please update the app to accept it.';
const NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Auto Pod not found' };
const NOT_YOUR_CLUB: Refusal = { code: 'FORBIDDEN', message: 'You do not administer this club' };

const VENUE_QUEUE = `query E2eVenueAutoPodQueue($venue: ID) { venueAutoPods(venue_id: $venue) { id } }`;
const CLUB_QUEUE = `query E2eClubAutoPodQueue { clubAdminAutoPods { id } }`;
const SLOTS = `query E2eAutoPodVenueSlots($id: ID!, $venue: ID!) { autoPodVenueSlots(auto_pod_doc_id: $id, venue_id: $venue) { __typename } }`;
const ACCEPT = `mutation E2eVenueAccept($id: ID!, $venue: ID!) { venueAcceptAutoPod(auto_pod_doc_id: $id, venue_id: $venue) { id } }`;
const VENUE_WITHDRAW = `mutation E2eVenueWithdraw($id: ID!) { venueWithdrawAutoPod(auto_pod_doc_id: $id) { id } }`;
const CLAIM = `mutation E2eClubClaim($id: ID!, $club: ID!) { clubClaimAutoPod(auto_pod_doc_id: $id, club_id: $club) { id } }`;
const CLUB_WITHDRAW = `mutation E2eClubWithdraw($id: ID!) { clubWithdrawAutoPod(auto_pod_doc_id: $id) { id } }`;
const READ = `query E2eAutoPodRead($id: ID!) { autoPod(auto_pod_doc_id: $id) { id } }`;
const OPEN_FOR_CLUB = `mutation E2eOpenAutoPod($club: ID) {
  createAutoPod(club_id: $club, input: {
    pod_title: "E2E probe", pod_description: "Never rolled out", sub_category_id: "${NO_ID}", pod_images_and_videos: []
  }) { id }
}`;

const ADMIN_ONLY = [
  call('createAutoPod', OPEN_FOR_CLUB, { club: null }),
  call(
    'updateAutoPod',
    `mutation E2eEditAutoPod($id: ID!) { updateAutoPod(auto_pod_doc_id: $id, input: { pod_title: "E2E probe" }) { id } }`,
    { id: NO_ID },
  ),
  call('autoPodAudience', `query E2eAutoPodAudience($id: ID!) { autoPodAudience(sub_category_id: $id) { __typename } }`, {
    id: NO_ID,
  }),
];
const TABLE = call('adminAutoPodsTable', `query E2eAutoPodsFirst { adminAutoPodsTable(query: { page_size: 1 }) { rows { id } } }`);

describe('API · Auto Pod enrolment needs a venue or club of one’s own', { testIsolation: false }, () => {
  let memberToken = '';
  let otherVenue = '';
  let liveOffer: string | null = null;

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    foreignVenueId().then((id) => {
      otherVenue = id;
    });
    asRole('ALL_PODS_ACCESS', (token) => {
      expectRead<{ rows: Array<{ id: string }> }>(token, TABLE).then((page) => {
        liveOffer = page.rows[0]?.id ?? null;
      });
    });
  });

  after(() => {
    revokeRunRoles(['ALL_PODS_ACCESS']);
  });

  it('APE-01 the venue and club queues are refused signed out, and empty for someone with no venue or club', () => {
    expectEachRefused('venueAutoPods', VENUE_QUEUE, {}, [[null, SIGNED_OUT]]);
    expectEachRefused('clubAdminAutoPods', CLUB_QUEUE, {}, [[null, SIGNED_OUT]]);
    cy.gqlRaw(VENUE_QUEUE, {}, { token: memberToken }).then((body) => expectAnswer('venueAutoPods', body, []));
    cy.gqlRaw(VENUE_QUEUE, { venue: otherVenue }, { token: memberToken }).then((body) =>
      expectAnswer('venueAutoPods', body, []),
    );
    cy.gqlRaw(CLUB_QUEUE, {}, { token: memberToken }).then((body) => expectAnswer('clubAdminAutoPods', body, []));
  });

  it('APE-02 accepting without offer terms, or through the old slot list, asks for the app update', () => {
    const update: Refusal = { code: 'BAD_USER_INPUT', message: UPDATE_APP };
    expectEachRefused('venueAcceptAutoPod', ACCEPT, { id: NO_ID, venue: otherVenue }, [
      [null, SIGNED_OUT],
      [memberToken, update],
    ]);
    expectEachRefused('autoPodVenueSlots', SLOTS, { id: NO_ID, venue: otherVenue }, [[memberToken, update]]);
  });

  it('APE-03 a venue withdraws, and a club claims, opens or withdraws, only what it holds', () => {
    expectEachRefused('venueWithdrawAutoPod', VENUE_WITHDRAW, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, NOT_FOUND],
    ]);
    expectEachRefused('venueWithdrawAutoPod', VENUE_WITHDRAW, { id: 'abc' }, [
      [memberToken, { code: 'BAD_USER_INPUT', message: 'Invalid auto_pod_doc_id' }],
    ]);
    expectEachRefused('clubClaimAutoPod', CLAIM, { id: NO_ID, club: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, NOT_YOUR_CLUB],
    ]);
    expectEachRefused('createAutoPod', OPEN_FOR_CLUB, { club: NO_ID }, [[memberToken, NOT_YOUR_CLUB]]);
    expectEachRefused('clubWithdrawAutoPod', CLUB_WITHDRAW, { id: NO_ID }, [[memberToken, NOT_FOUND]]);
  });

  it('APE-04 a real offer is not readable, nor claimable for a club, by someone with no standing in it', function () {
    if (!liveOffer) this.skip();
    expectEachRefused('autoPod', READ, { id: liveOffer }, [
      [null, SIGNED_OUT],
      [memberToken, NOT_FOUND],
    ]);
    expectEachRefused('clubClaimAutoPod', CLAIM, { id: liveOffer, club: NO_ID }, [[memberToken, NOT_YOUR_CLUB]]);
  });

  it('APE-05 rolling out, editing and the audience counts are refused to a member and to the Pods console role', () => {
    expectCallsRefused(memberToken, ADMIN_ONLY, ACCESS_DENIED);
    asRole('ALL_PODS_ACCESS', (token) => {
      expectCallsRefused(token, ADMIN_ONLY, ACCESS_DENIED);
      expectEachRefused('autoPod', READ, { id: NO_ID }, [[token, NOT_FOUND]]);
    });
  });
});
