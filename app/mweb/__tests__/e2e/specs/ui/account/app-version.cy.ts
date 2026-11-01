/// <reference types="cypress" />
import { openMenu } from '../../../support/menu-steps';
import { runAccount } from '../../../support/run-account';
import { declineTracking } from '../../../support/ui-apps-3';

/**
 * Force Update and App Version — the mWeb half. Scenario map: Apps › Force
 * Update and App Version ("App version captions", "Open in app banner (mWeb)").
 *
 * The build stamps package.json's version into the bundle (__APP_VERSION__,
 * vite.config.ts), and both the login screen and the menu footer print it — the
 * one app version the repo keeps in step across mWeb and the native app.
 * OpenInAppBanner shows only to an Android or iOS browser and links "Get app"
 * to the store URL appVersionInfo answers (the force-update gate's own source);
 * a desktop browser never sees it. The native update gate itself needs a native
 * build older than the server's minimum, which a browser cannot be.
 */

const VERSION_INFO = `query E2eAppVersionInfo { appVersionInfo { android_store_url } }`;
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

/** Make the next page load report an Android phone, as a phone browser would. */
function asAndroidPhone(): void {
  cy.on('window:before:load', (win) => {
    Object.defineProperty(win.navigator, 'userAgent', { value: ANDROID_UA, configurable: true });
  });
}

describe('App version captions and the open-in-app banner', () => {
  const account = runAccount();
  let version = '';

  before(() => {
    cy.readFile('package.json').then((pkg: { version: string }) => {
      version = pkg.version;
      expect(version, 'package.json carries a semantic version').to.match(/^\d+\.\d+\.\d+$/);
    });
  });

  beforeEach(() => {
    declineTracking();
  });

  it('AV-01 the login screen prints the build’s app version', () => {
    cy.clearAuth();
    cy.visitApp('/login');
    cy.byTestId('login-screen').should('contain.text', version);
  });

  it('AV-02 the menu footer prints the same version under Logout', () => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    openMenu();
    cy.byTestId('sidebar-app-version').should('contain.text', version);
  });

  it('AV-03 a desktop browser is never offered the app', () => {
    cy.clearAuth();
    cy.visitApp('/login');
    cy.byTestId('login-screen').should('be.visible');
    cy.byTestId('open-in-app-banner').should('not.exist');
  });

  it('AV-04 a phone browser is offered the app, Get app leads to the store link, and the banner can be dismissed', () => {
    cy.gql<{ appVersionInfo: { android_store_url: string | null } }>(VERSION_INFO, {}, { token: null }).then(({ appVersionInfo }) => {
      cy.clearAuth();
      asAndroidPhone();
      cy.visitApp('/login');
      cy.byTestId('open-in-app-banner').should('be.visible');
      cy.byTestId('open-in-app-open').should('be.visible');
      const storeUrl = (appVersionInfo.android_store_url ?? '').trim();
      if (storeUrl) {
        cy.byTestId('open-in-app-get').should('have.attr', 'href', storeUrl).and('have.attr', 'target', '_blank');
      } else {
        // Without a store link in Branding there is nowhere to send the visitor.
        cy.byTestId('open-in-app-get').should('not.exist');
      }
      cy.byTestId('open-in-app-dismiss').click();
      cy.byTestId('open-in-app-banner').should('not.exist');
    });
  });
});
