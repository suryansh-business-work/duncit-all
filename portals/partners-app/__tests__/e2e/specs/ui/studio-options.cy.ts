/// <reference types="cypress" />
import { STUDIO_OPTIONS_ENTRY, studioOptionsFor, type PartnerStudioMode } from '@duncit/utils';
import {
  partnerWorld,
  publicFlag,
  signInRunPartner,
  visitWithVenue,
  type PartnerWorld,
} from '../../support/ui-partners-3';

/**
 * Studio options, live (scenario map › Partners › Studio options).
 *
 * Each studio's ONE sidebar entry opens its Options page
 * (src/pages/studio-options-page/StudioOptionsPage.tsx): every option the
 * shared catalogue (@duncit/utils studio-options) lists for the studio and the
 * user's roles, app-only ones left out and Auto Pods only while `auto_pods` is
 * on — the expectation here is that same catalogue call. Venue Options keeps
 * the venue picker on the remembered venue. The run account holds the Venue,
 * Host and Club Admin studios; the Brand studio needs a role it does not hold.
 * Read-only.
 */

const MODES: readonly PartnerStudioMode[] = ['VENUE', 'HOST', 'CLUB'];

/** The page's option rows are exactly the catalogue's, in its order, each linking to its route. */
function expectOptions(mode: PartnerStudioMode, roles: readonly string[], autoPods: boolean): void {
  const expected = studioOptionsFor(mode, roles, { autoPods, console: true });
  expect(expected.length, `${mode} options in the catalogue`).to.be.greaterThan(0);
  cy.byTestId(`studio-options-${mode}`).within(() => {
    cy.get('[data-testid^="studio-option-item-"]').should((rows) => {
      const shown = [...rows].map((row) => ({ id: row.dataset.testid, href: row.getAttribute('href') }));
      expect(shown, `${mode} option rows`).to.deep.equal(
        expected.map((option) => ({ id: `studio-option-item-${option.key}`, href: option.portal })),
      );
    });
  });
}

describe('Partners · Studio options (Venue, Host and Club Admin studios)', () => {
  let world: PartnerWorld;
  let autoPods = false;

  before(() => {
    signInRunPartner();
    partnerWorld().then((found) => {
      world = found;
    });
    publicFlag('auto_pods').then((on) => {
      autoPods = on;
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  MODES.forEach((mode, index) => {
    it(`SO-0${index + 1} ${STUDIO_OPTIONS_ENTRY[mode].portal} lists the ${mode} studio’s catalogue options, each linking to its page`, () => {
      visitWithVenue(STUDIO_OPTIONS_ENTRY[mode].portal, world.venue.id);
      cy.byTestId(`studio-options-${mode}`).should('be.visible');
      expectOptions(mode, world.roles, autoPods);
    });
  });

  it('SO-04 Venue Options opens on the remembered venue, and an option opens its page for that venue', () => {
    cy.interceptOperation('MyVenues');
    visitWithVenue('/venues/options', world.venue.id);
    cy.wait('@MyVenues');
    cy.byTestId('venue-picker').should('have.value', world.venue.id);
    cy.byTestId('studio-option-item-publish').click();
    cy.location('pathname').should('eq', '/venues/publish');
    cy.byTestId('venue-publish-page').should('be.visible');
    cy.byTestId('venue-picker').should('have.value', world.venue.id);
  });

  it('SO-05 Host Options › Publish Your Host Page opens the host publish page', () => {
    cy.visitApp('/host/options');
    cy.byTestId('studio-option-item-publish').should('contain.text', 'Publish Your Host Page').click();
    cy.location('pathname').should('eq', '/host/publish');
    cy.byTestId('host-publish-page').should('be.visible');
  });
});
