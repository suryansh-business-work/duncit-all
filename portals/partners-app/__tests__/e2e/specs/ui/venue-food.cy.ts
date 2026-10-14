/// <reference types="cypress" />
import { draftOf, partnerWorld, signInRunPartner, visitWithVenue, type PartnerWorld } from '../../support/ui-partners-3';

/**
 * Venue food, live (scenario map › Partners › Venue food: "Food pages for a
 * venue that does not serve food"), on the run's draft venue — started by the
 * fixture step and never given a menu, so it does not offer food.
 *
 * The three food desk pages share VenueFoodToolPage
 * (src/components/venue/VenueFoodToolPage.tsx): for a venue that does not
 * offer food they show the page's own sentence and the way to the venue
 * form's Food section (VenueFoodOffAlert), never an empty table. Read-only.
 */

const PAGES = [
  {
    id: 'VF-01',
    path: '/venues/food-dashboard',
    testId: 'venue-food-dashboard',
    message: 'This venue does not offer food. Turn food on in its Food Menu section to see its food numbers.',
    tool: 'food-dashboard',
  },
  {
    id: 'VF-02',
    path: '/venues/food-orders',
    testId: 'venue-food-orders',
    message: 'This venue does not offer food. Turn food on in its Food Menu section to take orders.',
    tool: 'duncit-table-grid',
  },
  {
    id: 'VF-03',
    path: '/venues/food-coupons',
    testId: 'venue-food-coupons',
    message: 'This venue does not offer food. Turn food on in its Food Menu section to give guests food coupons.',
    tool: 'food-coupon-new',
  },
] as const;

describe('Partners · Venue food pages for a venue that does not serve food (the run’s draft venue)', () => {
  let world: PartnerWorld;

  before(() => {
    signInRunPartner();
    partnerWorld().then((found) => {
      world = found;
      if (draftOf(found).offersFood) throw new Error('The run’s draft venue offers food; this scenario needs one that does not.');
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  PAGES.forEach((page) => {
    it(`${page.id} ${page.path} shows the switch-food-on prompt and the way to the venue form, not the tool`, () => {
      cy.interceptOperation('VenueFoodOrderVenues');
      visitWithVenue(page.path, draftOf(world).id);
      cy.wait('@VenueFoodOrderVenues');
      cy.byTestId(`${page.testId}-page`).should('be.visible');
      cy.byTestId('venue-picker').should('have.value', draftOf(world).id);
      cy.byTestId(`${page.testId}-no-food`)
        .should('contain.text', page.message)
        .find('a')
        .should('have.text', 'Edit venue')
        .and('have.attr', 'href', `/register-venue/${draftOf(world).id}?selectedtab=food`);
      cy.byTestId(page.tool).should('not.exist');
    });
  });
});
