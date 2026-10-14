/// <reference types="cypress" />
import { runAccount } from '../../../support/run-account';
import {
  declineTracking,
  locations,
  mePlace,
  publicVenues,
  setHeaderCity,
  visitAndWait,
  type PlaceName,
  type PublicVenueRow,
} from '../../../support/ui-apps-3';

/**
 * Location — a public venue link into another city, live (scenario map ›
 * Location, third part).
 *
 * The header opens on the member's saved city (`selected_location_id`). A
 * venue whose `location_id` is another city opens the "different location"
 * dialog (hooks/useLocationMismatch.ts, components/LocationMismatchDialog.tsx):
 * "Switch to <city>" makes the venue's city the header's and saves it
 * (`setMySelectedLocation`), "Continue in <city>" leaves it alone. The saved
 * city is the run account's own; the spec sets it to the first venue's city
 * before each scenario and puts the original back at the end.
 */
/** A named city with an approved venue (the member's), and a venue in another named city. */
function twoCities(
  places: readonly PlaceName[],
  venues: readonly PublicVenueRow[],
): { homeCity: PlaceName; otherCity: PlaceName; otherVenue: PublicVenueRow } {
  const named = new Map(places.map((place) => [place.id, place]));
  const inCities = venues.filter((venue) => !!venue.location_id && named.has(venue.location_id));
  const first = inCities[0];
  const second = inCities.find((venue) => venue.location_id !== first?.location_id);
  const homeCity = first?.location_id ? named.get(first.location_id) : undefined;
  const otherCity = second?.location_id ? named.get(second.location_id) : undefined;
  if (!homeCity || !otherCity || !second) {
    throw new Error('Staging prerequisite: approved venues in two different cities.');
  }
  return { homeCity, otherCity, otherVenue: second };
}

describe('Location (venue link)', () => {
  const account = runAccount();
  let places: PlaceName[] = [];
  let originalCity: string | null = null;
  let homeCity: PlaceName;
  let otherCity: PlaceName;
  let otherVenue: PublicVenueRow;

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    mePlace().then((me) => {
      originalCity = me.selected_location_id;
    });
    locations().then((rows) => {
      places = rows;
    });
    publicVenues().then((venues) => {
      const pair = twoCities(places, venues);
      homeCity = pair.homeCity;
      otherCity = pair.otherCity;
      otherVenue = pair.otherVenue;
    });
  });

  beforeEach(() => {
    declineTracking();
    setHeaderCity(homeCity.id);
  });

  after(() => {
    setHeaderCity(originalCity);
  });

  it('LO-01 a venue in another city names both places and offers to switch', () => {
    visitAndWait(`/venue/${otherVenue.id}`, 'PublicVenueDetails');
    cy.byTestId('location-mismatch-dialog').should('be.visible');
    cy.byTestId('location-mismatch-title').should('have.text', 'This link is for a different location');
    cy.byTestId('location-mismatch-switch').should('have.text', `Switch to ${otherCity.location_name}`);
    cy.byTestId('location-mismatch-keep').should('have.text', `Continue in ${homeCity.location_name}`);
  });

  it('LO-02 Switch makes the venue’s city the member’s location and closes the dialog', () => {
    visitAndWait(`/venue/${otherVenue.id}`, 'PublicVenueDetails');
    cy.interceptOperation('SetMySelectedLocation');
    cy.byTestId('location-mismatch-switch').click();
    cy.wait('@SetMySelectedLocation');
    cy.byTestId('location-mismatch-dialog').should('not.exist');
    cy.byTestId('venue-details-screen').should('be.visible');
    mePlace().its('selected_location_id').should('eq', otherCity.id);
  });

  it('LO-03 Continue keeps the member’s city and opens the venue as it is', () => {
    visitAndWait(`/venue/${otherVenue.id}`, 'PublicVenueDetails');
    cy.byTestId('location-mismatch-keep').click();
    cy.byTestId('location-mismatch-dialog').should('not.exist');
    cy.byTestId('venue-details-header-title').should('have.text', otherVenue.venue_name);
    mePlace().its('selected_location_id').should('eq', homeCity.id);
  });
});
