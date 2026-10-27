/// <reference types="cypress" />
import { openSignedOut } from '../../../support/account-steps';
import { runAccount } from '../../../support/run-account';
import { declineTracking, publicVenues, visitAndWait } from '../../../support/ui-apps-3';

/**
 * Venue food ordering — the guest's cart and checkout form, live (scenario map
 * › Venue food ordering).
 *
 * A venue that serves food and takes QR orders shows a "+" on every available
 * dish (FoodItemCard); a dish switched off stays on the menu, labelled, with no
 * "+". The cart is the device's own (foodStorage), survives a reload and
 * floats as a bar with the count and total. The cart sheet's form (React Hook
 * Form + Zod, @duncit/forms food-checkout) checks each field as it is left —
 * the spec never presses Pay, so no order is placed and no payment is opened.
 * The guest is signed out, as at the table. The venue is read from
 * `publicVenue` first.
 */

interface FoodItem {
  id: string;
  name: string;
  is_available: boolean;
}

interface FoodVenue {
  id: string;
  venue_name: string;
  offers_food: boolean;
  food_menu: FoodItem[];
  food_ordering: { enabled: boolean };
}

const FOOD_VENUE = `query E2eUi3FoodVenue($id: ID!) {
  publicVenue(venue_id: $id) { id venue_name offers_food food_menu { id name is_available } food_ordering { enabled } }
}`;

/** The first of `venueIds` that takes QR orders and has a dish available — and that dish. */
function orderingVenue(venueIds: readonly string[], index = 0): Cypress.Chainable<{ venue: FoodVenue; dish: FoodItem }> {
  if (index >= venueIds.length) {
    throw new Error(
      'Staging prerequisite: an approved venue that serves food, takes QR orders (food_ordering.enabled) and has an available dish.',
    );
  }
  return cy.gql<{ publicVenue: FoodVenue | null }>(FOOD_VENUE, { id: venueIds[index] }).then(({ publicVenue }) => {
    const dish = publicVenue?.food_menu.find((item) => item.is_available);
    if (publicVenue?.food_ordering.enabled && dish) return cy.wrap({ venue: publicVenue, dish }, { log: false });
    return orderingVenue(venueIds, index + 1);
  });
}

describe('Venue food ordering', { testIsolation: false }, () => {
  const account = runAccount();
  let venue: FoodVenue;
  let dish: FoodItem;

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    publicVenues()
      .then((venues) => orderingVenue(venues.filter((row) => row.offers_food).map((row) => row.id)))
      .then((found) => {
        venue = found.venue;
        dish = found.dish;
      });
    cy.then(() => {
      cy.clearAuth();
      declineTracking();
    });
  });

  it('VF-01 every available dish offers "+", and a dish switched off is labelled with none', () => {
    openSignedOut(`/venue/${venue.id}`);
    cy.byTestId('venue-food-menu').should('be.visible');
    venue.food_menu.forEach((item) => {
      if (item.is_available) {
        cy.byTestId(`food-item-${item.id}-add`).should('exist');
        cy.byTestId(`food-item-unavailable-${item.id}`).should('not.exist');
      } else {
        cy.byTestId(`food-item-unavailable-${item.id}`).should('have.text', 'Unavailable');
        cy.byTestId(`food-item-${item.id}-add`).should('not.exist');
      }
    });
    cy.byTestId('food-cart-bar').should('not.exist');
  });

  it('VF-02 "+" builds the cart, the bar counts it, and the cart survives a reload', () => {
    cy.byTestId(`food-item-${dish.id}-add`).click();
    cy.byTestId(`food-item-${dish.id}-qty`).should('have.text', '1');
    cy.byTestId('food-cart-bar-count').should('have.text', '1 item');
    cy.byTestId(`food-item-${dish.id}-inc`).click();
    cy.byTestId(`food-item-${dish.id}-qty`).should('have.text', '2');
    cy.byTestId('food-cart-bar-count').should('have.text', '2 items');
    visitAndWait(`/venue/${venue.id}`, 'PublicVenueDetails');
    cy.byTestId(`food-item-${dish.id}-qty`).should('have.text', '2');
    cy.byTestId('food-cart-bar-count').should('have.text', '2 items');
    cy.byTestId(`food-item-${dish.id}-dec`).click();
    cy.byTestId('food-cart-bar-count').should('have.text', '1 item');
  });

  it('VF-03 the checkout form refuses an empty name and a mobile number that is not 10 digits', () => {
    cy.byTestId('food-cart-bar-open').click();
    cy.byTestId('food-cart-sheet').should('be.visible');
    cy.byTestId(`food-cart-line-${dish.id}`).should('contain.text', dish.name);
    cy.byTestId('food-checkout-form').should('be.visible');
    // The form checks a field once it has been left (mode: onTouched).
    cy.byTestId('field-name').focus();
    cy.byTestId('field-name').blur();
    cy.byTestId('name-error').should('have.text', 'Enter your name');
    cy.byTestId('field-phone').type('12345');
    cy.byTestId('field-phone').blur();
    cy.byTestId('phone-error').should('have.text', 'Enter a valid 10-digit mobile number');
    cy.byTestId('field-phone').type('abc');
    cy.byTestId('field-phone').should('have.value', '12345');
  });

  it('VF-04 removing the last dish empties the cart and the bar goes', () => {
    cy.byTestId(`food-cart-remove-${dish.id}`).click();
    cy.byTestId('food-cart-bar').should('not.exist');
    cy.byTestId(`food-item-${dish.id}-add`).should('exist');
  });
});
