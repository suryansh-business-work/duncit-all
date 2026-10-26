/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import { listedPod, runMe, signInOnLoginPage } from '../../../support/ui-apps-2';

/**
 * Share & deep links (UI), live on staging: a shared pod link opened signed
 * out parks the destination in ?redirect and opens it after sign-in, and the
 * open-in-app bar a phone browser gets. The pod is any listed pod with a club
 * page — only read.
 */

/** A phone browser, as the banner recognises one (`/android/i`). */
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

/** Every page this test loads reports `userAgent` as a phone's. */
function asPhoneBrowser(): void {
  cy.on('window:before:load', (win) => {
    Object.defineProperty(win.navigator, 'userAgent', { value: ANDROID_UA, configurable: true });
  });
}

describe('Share & deep links', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  it('SL-01 a pod link opened signed out goes through sign-in and lands on the pod', () => {
    runMe().then((me) => {
      listedPod(me.user_id).then((pod) => {
        const path = `/club/${pod.club_slug}/pod/${pod.pod_id}`;
        cy.clearAuth();
        cy.visitApp(path);
        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('eq', `?redirect=${encodeURIComponent(path)}`);
        signInOnLoginPage();
        cy.location('pathname').should('eq', path);
        cy.byTestId('pod-details-screen').should('exist');
      });
    });
    signInRunMember();
  });

  it('SL-02 a phone browser gets the open-in-app bar; Dismiss hides it for this visit only', () => {
    asPhoneBrowser();
    cy.visitApp('/profile');
    cy.byTestId('open-in-app-banner').should('be.visible');
    cy.byTestId('open-in-app-open').should('be.visible');
    cy.byTestId('open-in-app-dismiss').click();
    cy.byTestId('open-in-app-banner').should('not.exist');
    cy.reload();
    cy.byTestId('open-in-app-banner').should('be.visible');
  });

  it('SL-03 a desktop browser gets no open-in-app bar', () => {
    cy.visitApp('/profile');
    cy.byTestId('profile-page').should('be.visible');
    cy.byTestId('open-in-app-banner').should('not.exist');
  });
});
