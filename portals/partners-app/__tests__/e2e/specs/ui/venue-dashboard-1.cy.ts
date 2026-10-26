import { formatMoney, venueOwnerStatTiles, type VenueOwnerStats } from '@duncit/utils';
import {
  chooseOption,
  findPartnerWorld,
  rememberVenue,
  signInPartner,
  type PartnerWorld,
} from '../../support/partner-world-1';

/**
 * Partners · Venue Dashboard (/venues/dashboard): six tiles from
 * venueOwnerStats, scoped by the venue picker in the hero, and the Quick
 * actions widget. The run owns two venues (approved + draft); the page opens on
 * the remembered venue, so each scenario remembers the approved one first.
 *
 * Every figure is compared with what the server answered to the page's own
 * request, and the capacity tile with the venues' capacities myVenues reports.
 * Not here: the "no venues yet" prompt (the run account owns two).
 */

const ALL_VENUES = 'ALL';

/** What a tile prints for a value — the page's own formatting (VenueStatCards). */
const shown = (kind: string, value: number): string =>
  kind === 'money' ? formatMoney(value) : Number(value || 0).toLocaleString('en-IN');

/** Wait for the VenueOwnerStats request scoped to `venueId` (null = all venues) and yield its answer. */
function statsFor(venueId: string | null, tries = 3): Cypress.Chainable<VenueOwnerStats> {
  return cy.wait('@VenueOwnerStats').then(({ request, response }) => {
    if ((request.body.variables.venue_id ?? null) === venueId) {
      return cy.wrap(response?.body?.data?.venueOwnerStats as VenueOwnerStats, { log: false });
    }
    if (tries <= 1) throw new Error(`No VenueOwnerStats request for venue_id ${String(venueId)} was sent.`);
    return statsFor(venueId, tries - 1);
  });
}

/** Every tile reads what the server answered. */
function expectTiles(stats: VenueOwnerStats): void {
  venueOwnerStatTiles(stats).forEach((tile) => {
    cy.byTestId(`venue-stat-${tile.key}`).should('contain.text', shown(tile.kind, tile.value));
  });
}

describe('Partners UI · Venue dashboard', () => {
  let world: PartnerWorld;

  before(() => {
    signInPartner();
    findPartnerWorld().then((found) => {
      world = found;
    });
  });

  beforeEach(() => {
    signInPartner();
    cy.interceptOperation('VenueOwnerStats');
  });

  it('VD-01 All venues shows the combined tiles; Total capacity is every venue’s capacity added up', () => {
    rememberVenue(world.venue.id);
    cy.visitApp('/venues/dashboard');
    statsFor(world.venue.id);
    chooseOption('venue-dashboard-venue-filter', ALL_VENUES);
    statsFor(null).then((stats) => {
      const sum = world.venues.reduce((total, venue) => total + venue.capacity, 0);
      expect(stats.total_venues, 'total_venues').to.equal(world.venues.length);
      expect(stats.total_capacity, 'total_capacity').to.equal(sum);
      expectTiles(stats);
    });
  });

  it('VD-02 picking one venue re-asks venueOwnerStats for it, and the tiles follow the pick', () => {
    rememberVenue(world.venue.id);
    cy.visitApp('/venues/dashboard');
    statsFor(world.venue.id).then((stats) => {
      expect(stats.total_capacity, 'the approved venue’s capacity').to.equal(world.venue.capacity);
      expectTiles(stats);
    });
    chooseOption('venue-dashboard-venue-filter', world.draftVenue.id);
    statsFor(world.draftVenue.id).then((stats) => {
      expect(stats.total_venues, 'one venue in scope').to.equal(1);
      expect(stats.approved_venues, 'the draft is not approved').to.equal(0);
      expect(stats.total_capacity, 'the draft’s capacity').to.equal(world.draftVenue.capacity);
      expectTiles(stats);
    });
  });

  it('VD-03 Quick actions link to management, requests and — for an approved venue only — its calendar', () => {
    rememberVenue(world.venue.id);
    cy.visitApp('/venues/dashboard');
    statsFor(world.venue.id);
    cy.byTestId('venue-dashboard-quick-actions').within(() => {
      cy.get(`a[href="/venues/${world.venue.id}/availability"]`).should('contain.text', 'Availability Calendar');
      cy.get('a[href="/venues/requests"]').should('contain.text', 'Slot Requests');
    });
    chooseOption('venue-dashboard-venue-filter', world.draftVenue.id);
    statsFor(world.draftVenue.id);
    cy.byTestId('venue-dashboard-quick-actions')
      .find(`a[href="/venues/${world.draftVenue.id}/availability"]`)
      .should('not.exist');
    cy.byTestId('venue-dashboard-quick-actions')
      .find('a[href="/register-venue"]')
      .should('contain.text', 'Venue Management')
      .click();
    cy.location('pathname').should('eq', '/register-venue');
    cy.byTestId('venues-hub').should('be.visible');
  });
});
