/// <reference types="cypress" />
import { marked } from '../../../support/api-apps';
import { ensureFreePod, signInRunPartner, type FixtureWorld } from '../../../support/fixture-world';

/**
 * The fixture world (support/fixture-world.ts) — the run account becomes a
 * venue owner, a host and a club admin through the flows real partners use,
 * and hosts a FREE physical pod at its own venue. Every later spec in this
 * folder calls the same `ensure…` helpers, so this spec only proves each step
 * landed as the server describes it, and that asking twice builds nothing new.
 *
 * venue.service.ts approve and host.service.ts approve give the owner the
 * VENUE_OWNER and HOST roles; club.service.ts create gives every named admin
 * CLUB_ADMIN. The ONBOARDING_MANAGER and CITY_ADMIN roles that made those
 * calls are revoked as soon as they are answered. A pod on the host's own
 * slot needs no venue approval (pod.venue.ts resolveSlotForCreate), so it is
 * live at once with venue_approval_status NONE and books the slot outright.
 */

const ME = `query E2eWorldMe { me { user_id roles } }`;
const MY_VENUE = `query E2eWorldVenue($id: ID) { myVenue(venue_id: $id) { id status owner_user_id venue_name } }`;
const PUBLIC_VENUE = `query E2eWorldPublicVenue($id: ID!) { publicVenue(venue_id: $id) { id } }`;
const MY_VENUES = `query E2eWorldVenues { myVenues { id venue_name } }`;
const MY_HOST = `query E2eWorldHost { myHost { id status user_id } }`;
const MY_CLUBS = `query E2eWorldClubs { myAdminClubs { id club_name } }`;
const POD = `query E2eWorldPod($id: ID!) {
  pod(pod_doc_id: $id) { id pod_type pod_mode venue_id venue_slot_id club_id pod_hosts_id is_active venue_approval_status }
}`;
const SLOTS = `query E2eWorldSlots($venue: ID!) { venueSlots(venue_id: $venue) { id status booked_by_pod_id } }`;
const HOST_PODS = `query E2eWorldHostPods { myHostPods { id pod_title } }`;

describe('API · Fixture world: the run account as venue owner, host and club admin', { testIsolation: false }, () => {
  let token = '';
  let world: FixtureWorld;

  before(() => {
    signInRunPartner().then((partner) => {
      token = partner;
      ensureFreePod(partner).then((built) => {
        world = built;
      });
    });
    // Approval changed the account's roles: sign in again for a token that carries them.
    signInRunPartner().then((partner) => {
      token = partner;
    });
  });

  it('FW-01 the venue the member registered is approved, owned by the run account and public', () => {
    cy.gql(MY_VENUE, { id: world.venue.id }, { token }).then(({ myVenue }) => {
      expect(myVenue, 'myVenue').to.deep.equal({
        id: world.venue.id,
        status: 'APPROVED',
        owner_user_id: world.userId,
        venue_name: marked('venue'),
      });
    });
    cy.gql(PUBLIC_VENUE, { id: world.venue.id }, { token: null }).then(({ publicVenue }) => {
      expect(publicVenue, 'publicVenue').to.deep.equal({ id: world.venue.id });
    });
  });

  it('FW-02 approvals made the account a venue owner, host and club admin, and left no staff role behind', () => {
    cy.gql<{ me: { user_id: string; roles: string[] } }>(ME, {}, { token }).then(({ me }) => {
      expect(me.user_id, 'me.user_id').to.equal(world.userId);
      expect(me.roles, 'partner roles').to.include.members(['USER', 'VENUE_OWNER', 'HOST', 'CLUB_ADMIN']);
      expect(me.roles, 'ONBOARDING_MANAGER revoked').to.not.include('ONBOARDING_MANAGER');
      expect(me.roles, 'CITY_ADMIN revoked').to.not.include('CITY_ADMIN');
    });
  });

  it('FW-03 the host profile is approved and is the run account’s own', () => {
    cy.gql(MY_HOST, {}, { token }).then(({ myHost }) => {
      expect(myHost, 'myHost').to.deep.equal({ id: world.host.id, status: 'APPROVED', user_id: world.userId });
    });
  });

  it('FW-04 the run account administers its own club', () => {
    cy.gql<{ myAdminClubs: Array<{ id: string; club_name: string }> }>(MY_CLUBS, {}, { token }).then(({ myAdminClubs }) => {
      expect(myAdminClubs, 'myAdminClubs').to.deep.include({ id: world.club.id, club_name: marked('club') });
    });
  });

  it('FW-05 the free physical pod is live at the run’s venue and holds its slot', () => {
    cy.gql(POD, { id: world.pod.id }, { token }).then(({ pod }) => {
      expect(pod, 'pod').to.deep.equal({
        id: world.pod.id,
        pod_type: 'FREE',
        pod_mode: 'PHYSICAL',
        venue_id: world.venue.id,
        venue_slot_id: world.pod.slotId,
        club_id: world.club.id,
        pod_hosts_id: [world.userId],
        is_active: true,
        venue_approval_status: 'NONE',
      });
    });
    cy.gql<{ venueSlots: Array<{ id: string; status: string; booked_by_pod_id: string | null }> }>(
      SLOTS,
      { venue: world.venue.id },
      { token },
    ).then(({ venueSlots }) => {
      expect(venueSlots, 'the pod’s slot').to.deep.include({
        id: world.pod.slotId,
        status: 'BOOKED',
        booked_by_pod_id: world.pod.id,
      });
    });
  });

  it('FW-06 asking for the world again finds it and builds nothing new', () => {
    ensureFreePod(token).then((again) => {
      expect(again, 'the same world').to.deep.equal(world);
    });
    cy.gql<{ myVenues: Array<{ venue_name: string }> }>(MY_VENUES, {}, { token }).then(({ myVenues }) => {
      expect(myVenues.filter((v) => v.venue_name === marked('venue')), 'run venues').to.have.length(1);
    });
    cy.gql<{ myHostPods: Array<{ pod_title: string }> }>(HOST_PODS, {}, { token }).then(({ myHostPods }) => {
      expect(myHostPods.filter((p) => p.pod_title === marked('free pod')), 'run free pods').to.have.length(1);
    });
  });
});
