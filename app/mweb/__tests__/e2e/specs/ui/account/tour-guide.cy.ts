/// <reference types="cypress" />
import { TOURS, toursForRoles } from '@duncit/tours';
import { signInRunMember } from '../../../support/access-steps';
import { openMenu } from '../../../support/menu-steps';
import { declineTracking, publicFlag } from '../../../support/ui-apps-3';

/**
 * Tour Guide, live (scenario map › Tour guide).
 *
 * /tour-guide lists every walkthrough in @duncit/tours that the member's roles
 * allow (`toursForRoles` — Create Pod needs HOST, so a plain member never sees
 * it), and the menu row is gated by the `tour_guide` flag. Starting a tour
 * navigates to the screen it runs on (tour-guide-page/index.tsx). The run
 * account is a plain member, so its list is the registry minus Create Pod.
 */
describe('Tour guide', () => {
  before(() => {
    signInRunMember();
  });

  beforeEach(() => {
    declineTracking();
  });

  it('TG-01 the menu offers "Tour Guide" exactly when the tour_guide flag is on', () => {
    publicFlag('tour_guide').then((on) => {
      openMenu();
      cy.byTestId('sidebar-item-FAQs').should('exist');
      cy.byTestId('sidebar-item-Tour Guide').should(on ? 'exist' : 'not.exist');
    });
  });

  it('TG-02 a plain member is offered every tour but Create Pod', () => {
    const offered = toursForRoles(['USER']);
    expect(offered.map((tour) => tour.id), 'the registry hides Create Pod from a member').not.to.include('create-pod');
    cy.visitApp('/tour-guide');
    cy.byTestId('tour-guide-page').should('be.visible');
    cy.byTestIdPrefix('tour-start-').should('have.length', offered.length);
    offered.forEach((tour) => cy.byTestId(`tour-start-${tour.id}`).should('be.visible'));
    TOURS.filter((tour) => !offered.includes(tour)).forEach((tour) =>
      cy.byTestId(`tour-start-${tour.id}`).should('not.exist'),
    );
  });

  it('TG-03 starting a tour opens the screen it runs on', () => {
    const profileTour = TOURS.find((tour) => tour.id === 'profile');
    if (!profileTour) throw new Error('The @duncit/tours registry no longer has the Profile tour.');
    cy.visitApp('/tour-guide');
    cy.byTestId('tour-start-profile').click();
    cy.location('pathname').should('eq', profileTour.path);
  });

  it('TG-04 back leaves the Tour Guide for the screen it was opened from', () => {
    cy.visitApp('/faqs');
    cy.location('pathname').should('eq', '/faqs');
    cy.visitApp('/tour-guide');
    cy.byTestId('tour-guide-back').click();
    cy.location('pathname').should('eq', '/faqs');
  });
});
