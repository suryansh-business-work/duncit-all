/// <reference types="cypress" />
import { openSignedOut } from '../../../support/account-steps';
import { runAccount } from '../../../support/run-account';
import { declineTracking, expectSignInFor } from '../../../support/ui-apps-3';

/**
 * Legacy links, live (scenario map › Legacy links).
 *
 * `/bouncers` is a retired route kept so old links — and the host SOS and
 * feedback notifications that still carry `/bouncers?sos=<id>` — land
 * somewhere: AppRoutes replaces it with `/support` (accountRoutes.tsx), which
 * is a signed-in page like any other.
 */
describe('Legacy links', () => {
  const account = runAccount();

  beforeEach(() => {
    declineTracking();
  });

  it('LL-01 signed in, /bouncers is replaced by the Support hub', () => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    cy.visitApp('/bouncers');
    cy.location('pathname').should('eq', '/support');
    cy.byTestId('support-hub-page').should('be.visible');
  });

  it('LL-02 a notification link /bouncers?sos=<id> lands on /support without its query', () => {
    cy.visitApp('/bouncers?sos=e2e-legacy');
    cy.location('pathname').should('eq', '/support');
    cy.location('search').should('eq', '');
    cy.byTestId('support-hub-page').should('be.visible');
  });

  it('LL-03 signed out, /bouncers goes to /support, which sends the visitor to sign in', () => {
    openSignedOut('/bouncers');
    expectSignInFor('/support');
  });
});
