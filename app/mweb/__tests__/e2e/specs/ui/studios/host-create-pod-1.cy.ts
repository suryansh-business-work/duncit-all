/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';

/**
 * Host - create pod (first part of the module; the stepper rows need an
 * approved host and live in host-create-pod-*.cy.ts). /create-pod is open to
 * every signed-in member, but only an approved host is given the stepper
 * (create-pod-page/index.tsx); anyone else is told what is missing.
 */

describe('UI Host - create pod (1)', () => {
  before(() => {
    signInRunMember();
  });

  it('HC-01 a member who is not a host gets no stepper, only the reason and the way to become one', () => {
    cy.interceptOperation('CreatePodOptions');
    cy.visitApp('/create-pod');
    cy.wait('@CreatePodOptions');
    cy.byTestId('create-pod-page').should('be.visible');
    cy.byTestId('create-pod-not-host')
      .should('contain.text', 'An approved host profile is required before creating pods.')
      .and('be.visible');
    cy.byTestId('create-pod-become-host').should('have.text', 'Become a host');
    cy.byTestId('create-pod-loading').should('not.exist');
    cy.byTestId('create-pod-page-error').should('not.exist');
  });
});
