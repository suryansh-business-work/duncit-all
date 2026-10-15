import { submitPassword } from '../../support/login-page';
import type { RunAccount } from '../../support/run-account';
import { navLeaf, openSignedIn, runPasswordNow, storedToken } from '../../support/ui-shell';
import { countOperation, expectNotSent, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Session, boot and access gates, on Support: a stored session
 * survives a reload, every route but /login is behind RequireAuth, a token the
 * server will not answer for opens the "User data not loaded" recovery dialog,
 * the portal-mode gate fails open, and the chrome keeps the page title and the
 * skip link. (Ending the account from another device is not driven: it would
 * delete the run account the later specs still use.)
 */

describe('Portal Shell · Session, boot and access gates (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  it('SBG-01 a reload with the token in storage comes back signed in as the same person, without a sign-in', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/tickets');
    cy.byTestId('shell-user-menu-button').should('contain.text', account.email);
    const login = countOperation('ConsoleLogin');
    cy.interceptOperation('SessionMe');
    cy.reload();
    cy.wait('@SessionMe').its('response.body.data.me.email').should('eq', account.email);
    cy.location('pathname').should('eq', '/tickets');
    cy.byTestId('shell-user-menu-button').should('contain.text', account.email);
    expectNotSent(login, 'ConsoleLogin');
  });

  it('SBG-02 a protected route without a token bounces to the login screen, which is itself never guarded', () => {
    cy.clearAuth();
    cy.visitPortal('support', '/profile');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', '?redirect=%2Fprofile');
    cy.byTestId('login-screen').should('be.visible');

    // Signed in already, /login still renders, and signing in again replaces the token.
    cy.apiPortalLogin('support', account.email, runPasswordNow(account)).then((first) => {
      cy.visitPortal('support', '/login');
      cy.byTestId('login-screen').should('be.visible');
      // Tokens are stamped to the second (iat); a new one needs the clock to move.
      cy.wait(1100);
      submitPassword(account.email, runPasswordNow(account));
      cy.location('pathname').should('eq', '/');
      storedToken('support').should('be.a', 'string').and('not.equal', first);
    });
  });

  it('SBG-03 a token the server answers no user for opens the recovery dialog; Logout clears storage and lands on /login', () => {
    cy.clearAuth();
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('support_token', 'e2e-not-a-session');
        win.sessionStorage.setItem('e2e-marker', 'set');
      },
    });
    cy.byTestId('user-data-not-loaded-dialog')
      .should('contain.text', 'User data not loaded')
      .and('contain.text', 'Please reload the application so your latest account data can load correctly.');
    // Neither Escape nor a backdrop click dismisses it.
    cy.get('body').type('{esc}');
    cy.byTestId('user-data-not-loaded-dialog').should('be.visible');
    cy.byTestId('user-data-not-loaded-reload').should('be.visible');
    cy.byTestId('user-data-not-loaded-logout').click();
    cy.location('pathname').should('eq', '/login');
    cy.byTestId('login-screen').should('be.visible');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('support_token'), 'the token').to.equal(null);
      expect(win.sessionStorage.getItem('e2e-marker'), 'session storage').to.equal(null);
    });
  });

  it('SBG-04 the portal-mode gate fails open: an unreachable portalMode check still renders the console', () => {
    cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
      // PortalModeGate posts its own fetch, `query PortalMode(...)`, with no operationName.
      if (String((req.body as { query?: string } | undefined)?.query ?? '').startsWith('query PortalMode(')) {
        req.alias = 'PortalModeCheck';
        req.reply({ forceNetworkError: true });
      }
    });
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    cy.visitPortal('support', '/');
    cy.wait('@PortalModeCheck');
    cy.byTestId('shell-user-menu-button').should('be.visible');
    cy.byTestId('app-shell-main').should('be.visible');
    cy.contains('We’ll be back soon').should('not.exist');
  });

  it('SBG-05 the tab title follows the page, and the skip link moves focus to the main region', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/tickets');
    cy.title().should('eq', 'Tickets | Duncit Support');
    navLeaf('Mail Automation').click();
    cy.location('pathname').should('eq', '/mail-automation');
    cy.title().should('eq', 'Mail Automation | Duncit Support');

    cy.byTestId('app-shell-skip-link').should('have.text', 'Skip to main content').focus();
    cy.byTestId('app-shell-skip-link').should('have.css', 'left', '8px');
    cy.byTestId('app-shell-skip-link').click();
    cy.location('hash').should('eq', '#main-content');
    cy.focused().should('have.attr', 'data-testid', 'app-shell-main');
  });
});
