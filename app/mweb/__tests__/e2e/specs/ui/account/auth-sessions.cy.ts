/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import { openMenu } from '../../../support/menu-steps';
import { openAccount } from '../../../support/profile-steps';

/**
 * Auth - Sessions, live on staging, as the run account (a plain member).
 *
 * Sign-out on mWeb is the client's: `UserContext.logout` wipes both storages
 * (keeping only the device id) and lands on /login. A token the server refuses
 * ends the session in `user-info/load.ts` → `endRejectedSession`; a marketing
 * short link (`?dl=`) signs a held session out before React mounts
 * (`lib/session-guard.ts`), while a member share (`&dls=1`) does not.
 */

/** A token no Duncit server signed — what a blocked account or a rotated secret looks like to the app. */
const REFUSED_TOKEN = 'e2e.refused.token';
const STORAGE_MARKER = 'e2e-session-marker';

/** `cy.visit` with the splash skipped and `token` in storage (visitApp's own boot, with any token). */
function visitWithToken(path: string, token: string): void {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.sessionStorage.setItem('duncit_splash_shown', '1');
      win.localStorage.setItem('token', token);
    },
  });
}

describe('UI Auth - Sessions', () => {
  before(() => {
    signInRunMember();
  });

  it('AS-01 a session loads the account, coins and policy links in one request, and the menu reuses it', () => {
    cy.interceptOperation('UserInfo');
    openMenu();
    cy.wait('@UserInfo').its('response.body.data').should((data: Record<string, unknown>) => {
      expect(data, 'one answer carries the account').to.have.nested.property('me.user_id');
      expect(data, 'and the coin balance').to.have.nested.property('myCoinBalance.balance');
      expect(data, 'and the policy links').to.have.property('publicPolicies');
    });
    cy.byTestId('sidebar-identity').should('be.visible');
    cy.byTestId('sidebar-duncit-coin-balance').should('be.visible');
    cy.get('@UserInfo.all').should('have.length', 1);
  });

  it('AS-02 Logout on Manage Account returns to /login with the session and its storage cleared', () => {
    openAccount();
    // Something of the session's own in each storage, so the wipe is seen rather than assumed.
    cy.window().then((win) => {
      win.localStorage.setItem(STORAGE_MARKER, '1');
      win.sessionStorage.setItem(STORAGE_MARKER, '1');
    });
    cy.byTestId('account-logout').should('contain.text', 'Logout').click();
    cy.location('pathname').should('eq', '/login');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token'), 'the token').to.be.null;
      expect(win.localStorage.getItem('mweb_user'), 'the cached user').to.be.null;
      expect(win.localStorage.getItem(STORAGE_MARKER), 'local storage is wiped').to.be.null;
      expect(win.sessionStorage.getItem(STORAGE_MARKER), 'session storage is wiped').to.be.null;
      expect(win.localStorage.getItem('duncit_duid'), 'the device id survives').to.not.be.null;
    });
    cy.visit('/account');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent('/account')}`);
  });

  it('AS-03 a token the server refuses is treated as signed out', () => {
    cy.interceptOperation('UserInfo');
    visitWithToken('/menu', REFUSED_TOKEN);
    cy.wait('@UserInfo');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent('/menu')}`);
    cy.window().its('localStorage').invoke('getItem', 'token').should('be.null');
  });

  it('AS-04 a marketing short link starts at sign-in even with a live session', () => {
    cy.visitApp('/menu?dl=e2e-marketing-link');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent('/menu')}`);
    cy.window().its('localStorage').invoke('getItem', 'token').should('be.null');
  });

  it('AS-05 a link a member shared opens without signing out', () => {
    cy.visitApp('/menu?dl=e2e-member-link&dls=1');
    cy.location('pathname').should('eq', '/menu');
    cy.byTestId('menu-panel').should('be.visible');
    cy.window().its('localStorage').invoke('getItem', 'token').should('not.be.null');
  });
});
