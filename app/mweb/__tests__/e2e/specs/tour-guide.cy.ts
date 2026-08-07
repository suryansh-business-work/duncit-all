/// <reference types="cypress" />

import { bootFixtures } from '../support/data';

/**
 * The guided walkthroughs, driven the way a person drives them: open the Tour
 * Guide centre, press Start, and watch what the tooltip actually does.
 *
 * A tour is the one feature nothing else can stand in for — it is a runtime
 * that measures real elements on a real page, so a unit test with stub anchors
 * proves only that the wiring compiles.
 */
describe('Tour Guide', () => {
  beforeEach(() => {
    cy.blockThirdParty();
    cy.seedAuth();
    cy.mockGraphql(bootFixtures);
  });

  it('lists the tours a signed-in user can take', () => {
    cy.visitApp('/tour-guide');
    cy.contains('Tour Guide').should('be.visible');
    cy.get('[data-testid^="tour-start-"]').should('have.length.at.least', 1);
  });

  it('starting the Home tour lands on Home and opens the first step', () => {
    cy.visitApp('/tour-guide');
    cy.get('[data-testid="tour-start-home"]').click();
    cy.location('pathname').should('eq', '/');
    // The tooltip is the whole point: it must appear, on its own, with no
    // beacon to hunt for.
    cy.get('[data-test-id="tooltip"], .react-joyride__tooltip', { timeout: 15000 })
      .should('be.visible')
      .and('contain.text', 'Next');
  });

  it('walks forward through the steps and finishes', () => {
    cy.visitApp('/tour-guide');
    cy.get('[data-testid="tour-start-home"]').click();
    cy.get('[data-test-id="tooltip"], .react-joyride__tooltip', { timeout: 15000 }).should(
      'be.visible',
    );

    // Press Next until the last step offers Finish, then end it.
    const advance = (guard: number) => {
      if (guard === 0) throw new Error('the tour never reached its last step');
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Finish")').length > 0) {
          cy.contains('button', 'Finish').click();
          return;
        }
        cy.contains('button', 'Next').click();
        advance(guard - 1);
      });
    };
    advance(12);

    // Finishing puts it away and records it.
    cy.get('.react-joyride__tooltip').should('not.exist');
    cy.visitApp('/tour-guide');
    cy.contains('Completed').should('be.visible');
  });

  it('Skip ends the tour', () => {
    cy.visitApp('/tour-guide');
    cy.get('[data-testid="tour-start-home"]').click();
    cy.get('[data-test-id="tooltip"], .react-joyride__tooltip', { timeout: 15000 }).should(
      'be.visible',
    );
    cy.contains('button', 'Skip').click();
    cy.get('.react-joyride__tooltip').should('not.exist');
  });
});
