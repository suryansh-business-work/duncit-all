/// <reference types="cypress" />

import { bootFixtures } from '../support/data';

const GEOCODE_RESPONSE = {
  status: 'OK',
  results: [
    {
      address_components: [
        { long_name: 'Bengaluru', short_name: 'Bengaluru', types: ['locality'] },
        { long_name: 'Karnataka', short_name: 'KA', types: ['administrative_area_level_1'] },
        { long_name: 'India', short_name: 'IN', types: ['country'] },
        { long_name: '560001', short_name: '560001', types: ['postal_code'] },
      ],
    },
  ],
};

describe('Location', () => {
  beforeEach(() => {
    cy.seedAuth();
    cy.mockGraphql(bootFixtures);
    // Native geolocation in Bengaluru; the reverse-geocode is routed to a
    // city/pincode that matches the seeded location (loc1, which has active pods).
    cy.useGeolocation({ latitude: 12.97, longitude: 77.59 });
    cy.intercept(/maps\.googleapis\.com\/maps\/api\/geocode/, (req) => {
      req.reply({ statusCode: 200, body: GEOCODE_RESPONSE });
    }).as('geocode');
    cy.intercept(/maps\.googleapis\.com\/maps\/api\/js/, (req) => {
      req.reply({ statusCode: 200, headers: { 'content-type': 'application/javascript' }, body: '' });
    });
  });

  it('the location dialog lists the available city', () => {
    cy.visitApp('/');
    cy.get('[aria-label="Change city or zone"]').first().click();
    cy.contains('Choose your location').should('be.visible');
    // Scoped to the sheet — the header also shows the current city behind it.
    cy.get('.MuiDrawer-paper').contains('Bengaluru').should('be.visible');
  });

  it('"Use my location" applies a city that has active pods (bug 5)', () => {
    cy.visitApp('/');
    cy.get('[aria-label="Change city or zone"]').first().click();
    cy.contains('button', /Use my location/i).click();
    cy.wait('@geocode', { timeout: 15000 });
    // loc1 has live pods → it auto-applies, closes the sheet and stays on Home.
    // The sheet is a SwipeableDrawer (keepMounted), so it hides rather than unmounts.
    cy.contains('Choose your location').should('not.be.visible');
    cy.contains('Happening nearby').should('be.visible');
  });
});
