/// <reference types="cypress" />

import { podDetailFixtures, product } from '../support/data';

const POD_URL = '/club/jazz-club/pod/sunset-jam';

describe('Pod Detail', () => {
  beforeEach(() => {
    cy.blockThirdParty();
    cy.seedAuth();
  });

  it('renders the pod with a Time & Venue section (bug 13)', () => {
    cy.mockGraphql(podDetailFixtures());
    cy.visitApp(POD_URL);
    cy.contains('Sunset Jam').should('be.visible');
    cy.contains('Time & Venue').should('be.visible');
    cy.contains(/^When$/).should('be.visible');
    cy.contains(/^Where$/).should('be.visible');
  });

  it('hides the Pod Shop when there are no products (bug 12)', () => {
    cy.mockGraphql(podDetailFixtures({ product_requests: [] }));
    cy.visitApp(POD_URL);
    cy.contains('Sunset Jam').should('be.visible');
    cy.contains(/Pod Shop|Products/i).should('not.exist');
  });

  it('shows the Pod Shop when the pod has products (bug 12)', () => {
    cy.mockGraphql(podDetailFixtures({ products_enabled: true, product_requests: [product] }));
    cy.visitApp(POD_URL);
    cy.contains('Pod Shop').scrollIntoView().should('be.visible');
    cy.contains('Vinyl Record').should('be.visible');
  });

  it('shows a Club Details section with the club (bug 15)', () => {
    cy.mockGraphql(podDetailFixtures());
    cy.visitApp(POD_URL);
    cy.get('[aria-label="Expand all sections"]').click();
    cy.contains('Club details').should('be.visible');
    cy.contains('Jazz Club').should('be.visible');
  });

  it('share button is present on the pod (bug 14)', () => {
    cy.mockGraphql(podDetailFixtures());
    cy.visitApp(POD_URL);
    cy.get('[aria-label="Share"]').should('be.visible');
  });
});
