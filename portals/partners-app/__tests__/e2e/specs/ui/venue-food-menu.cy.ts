/// <reference types="cypress" />
import {
  countOperation,
  draftOf,
  expectNotSent,
  marked,
  partnerWorld,
  signInRunPartner,
  visitWithVenue,
  type PartnerWorld,
} from '../../support/ui-partners-3';

/**
 * Venue food menu, live (scenario map › Partners › Venue food menu), on the
 * run's own venue — which the fixture step (fixtures/venue-food.cy.ts VFD-03)
 * left serving food, with a menu, ordering off and no Razorpay account.
 *
 * /venues/food-menu (src/pages/venue-food-menu-page) mounts @duncit/venue-food's
 * VenueFoodMenu for the selected venue: the dishes, QR ordering and the GST
 * number, saved through `updateApprovedVenue` (UpdateVenueFoodMenu). Ordering
 * stays off — it needs a Razorpay account, and no money may move here. The
 * dish this spec adds it removes again through the page, and `after()` puts
 * the menu back if a scenario stopped half-way. A venue that is not approved
 * edits its menu in the venue form instead.
 */

const PREFIX = 'partners-app-venue-food-menu';

const MENU_FIELDS = 'id name description category price images diet spice_level is_available';
const OWNER_MENU = `query E2eUiP3FoodMenu($id: ID!) {
  myVenue(venue_id: $id) { offers_food food_menu { ${MENU_FIELDS} } }
}`;
const PUBLIC_MENU = `query E2eUiP3PublicMenu($id: ID!) { publicVenue(venue_id: $id) { offers_food food_menu { id name } } }`;
const CONFIG = `query E2eUiP3FoodConfig { venueRegistrationConfig { food_price_max food_menu_limit } }`;
const SAVE_MENU = `mutation E2eUiP3RestoreMenu($id: ID!, $input: UpdateApprovedVenueInput!) {
  updateApprovedVenue(venue_id: $id, input: $input) { id }
}`;

interface Dish {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  images: string[];
  diet: string | null;
  spice_level: string | null;
  is_available: boolean;
}

const ownerMenu = (venueId: string): Cypress.Chainable<{ offers_food: boolean; food_menu: Dish[] }> =>
  cy.gql<{ myVenue: { offers_food: boolean; food_menu: Dish[] } }>(OWNER_MENU, { id: venueId }).then((data) => data.myVenue);

/** The menu page for `venueId`, once its venue and the menu caps are in. */
function openMenu(venueId: string): void {
  cy.interceptOperation('OwnerVenueFoodMenu');
  cy.interceptOperation('VenueFoodMenuConfig');
  visitWithVenue('/venues/food-menu', venueId);
  cy.wait(['@OwnerVenueFoodMenu', '@VenueFoodMenuConfig']);
}

/** `Save` and wait for the server's answer. */
function saveMenu(): void {
  cy.interceptOperation('UpdateVenueFoodMenu');
  cy.byTestId(`${PREFIX}-save`).should('have.text', 'Save').click();
  cy.wait('@UpdateVenueFoodMenu').its('response.body.errors').should('be.undefined');
  cy.byTestId('notify-success').should('have.text', 'Food menu saved');
}

describe('Partners · Venue food menu (the run’s own venue)', () => {
  let world: PartnerWorld;
  let original: Dish[] = [];
  const dishName = marked('ui dish');

  before(() => {
    signInRunPartner();
    partnerWorld().then((found) => {
      world = found;
      ownerMenu(found.venue.id).then((venue) => {
        if (!venue.offers_food || venue.food_menu.length === 0) {
          throw new Error('Fixture prerequisite: the run venue does not serve food with a menu (fixtures/venue-food.cy.ts VFD-03).');
        }
        original = venue.food_menu.filter((dish) => dish.name !== dishName);
      });
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  after(() => {
    if (!world || original.length === 0) return;
    signInRunPartner();
    ownerMenu(world.venue.id).then((venue) => {
      if (!venue.food_menu.some((dish) => dish.name === dishName)) return;
      const foodMenu = original.map((dish) => ({
        id: dish.id,
        name: dish.name,
        description: dish.description ?? '',
        category: dish.category ?? '',
        price: dish.price,
        images: dish.images,
        diet: dish.diet,
        spice_level: dish.spice_level,
        is_available: dish.is_available,
      }));
      cy.gql(SAVE_MENU, { id: world.venue.id, input: { offers_food: true, food_menu: foodMenu } });
    });
  });

  it('VFM-01 the form opens on the saved menu; a new dish saves and the public venue page lists it', () => {
    openMenu(world.venue.id);
    cy.byTestId(`${PREFIX}-offers-food`).find('input').should('be.checked');
    original.forEach((dish, index) => {
      cy.byTestId(`${PREFIX}-food-item-${index}-name`).find('input').should('have.value', dish.name);
    });
    cy.byTestId(`${PREFIX}-food-ordering-enabled`).find('input').should('not.be.checked');
    const added = original.length;
    cy.byTestId(`${PREFIX}-food-add`).should('have.text', 'Add menu item').click();
    cy.byTestId(`${PREFIX}-food-item-${added}-name`).find('input').type(dishName);
    cy.byTestId(`${PREFIX}-food-item-${added}-price`).find('input').clear().type('150');
    saveMenu();
    cy.gql<{ publicVenue: { offers_food: boolean; food_menu: Array<{ id: string; name: string }> } }>(
      PUBLIC_MENU,
      { id: world.venue.id },
      { token: null },
    ).then(({ publicVenue }) => {
      expect(publicVenue.offers_food, 'public offers_food').to.equal(true);
      expect(publicVenue.food_menu.map((dish) => dish.name), 'public menu').to.include(dishName);
    });
  });

  it('VFM-02 removing that dish and saving takes it off the menu, and every other dish keeps its id', () => {
    ownerMenu(world.venue.id).then((venue) => {
      const index = venue.food_menu.findIndex((dish) => dish.name === dishName);
      if (index < 0) throw new Error(`"${dishName}" is not on the menu: VFM-01 did not save it.`);
      openMenu(world.venue.id);
      cy.byTestId(`${PREFIX}-food-item-${index}-name`).find('input').should('have.value', dishName);
      cy.byTestId(`${PREFIX}-food-item-${index}-remove`).should('have.attr', 'aria-label', `Remove ${dishName}`).click();
      cy.get(`[data-testid^="${PREFIX}-food-item-"][data-testid$="-name"]`).should('have.length', venue.food_menu.length - 1);
      saveMenu();
      ownerMenu(world.venue.id).then((saved) => {
        expect(saved.food_menu.map((dish) => dish.id), 'menu ids').to.deep.equal(original.map((dish) => dish.id));
      });
    });
  });

  it('VFM-03 a dish without a name or priced over the cap is refused on the page, and nothing is saved', () => {
    cy.gql<{ venueRegistrationConfig: { food_price_max: number; food_menu_limit: number } }>(CONFIG).then(
      ({ venueRegistrationConfig: limits }) => {
        if (original.length >= limits.food_menu_limit) {
          throw new Error(`The run venue's menu is at its ${limits.food_menu_limit}-item limit, so no dish can be added.`);
        }
        openMenu(world.venue.id);
        const saves = countOperation('UpdateVenueFoodMenu');
        const added = original.length;
        cy.byTestId(`${PREFIX}-food-add`).click();
        cy.byTestId(`${PREFIX}-food-item-${added}-price`).find('input').clear().type(String(limits.food_price_max + 1));
        cy.byTestId(`${PREFIX}-save`).click();
        cy.byTestId(`${PREFIX}-food-item-${added}-name`).should('contain.text', 'Give this menu item a name');
        cy.byTestId(`${PREFIX}-food-item-${added}-price`).should(
          'contain.text',
          `The price cannot be more than ${limits.food_price_max}`,
        );
        expectNotSent(saves, 'UpdateVenueFoodMenu');
      },
    );
  });

  it('VFM-04 a venue that is not approved is sent to the venue form’s Food section', () => {
    openMenu(draftOf(world).id);
    cy.byTestId('venue-picker').should('have.value', draftOf(world).id);
    cy.byTestId(`${PREFIX}-not-approved`).should(
      'contain.text',
      'This venue is not approved yet. Until it is, its food menu is edited in the venue form with the rest of the application.',
    );
    cy.byTestId(`${PREFIX}-form`).should('not.exist');
    cy.byTestId('venue-food-menu-open-form')
      .should('have.text', 'Edit venue')
      .and('have.attr', 'href', `/register-venue/${draftOf(world).id}?selectedtab=food`);
  });
});
