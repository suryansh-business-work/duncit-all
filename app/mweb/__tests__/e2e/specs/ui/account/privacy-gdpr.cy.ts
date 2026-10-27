/// <reference types="cypress" />
import { runAccount } from '../../../support/run-account';
import { declineTracking } from '../../../support/ui-apps-3';

/**
 * Privacy (GDPR) — tracking choices, live (scenario map › Privacy (GDPR)).
 *
 * Profile Settings › Privacy & data (/account/privacy) shows the three consent
 * rows (ConsentSwitches): Essential is always on, Analytics and Marketing are
 * the member's to change. A switch saves at once on this device (the consent
 * cookie) and the signed-in sync (useConsentSync) records the new answer on the
 * server with `setMyTrackingConsent` — the record that proves consent. The
 * choice is the run account's own; the spec starts from "both declined" and
 * leaves it there.
 */

const MY_CONSENT = `query E2eUi3Consent { myTrackingConsent { analytics marketing } }`;

type Consent = { analytics: boolean; marketing: boolean };

const POLL_MS = 500;
const POLL_TRIES = 20;

/**
 * Read the stored choice until it is `expected`. The sync writes it from an
 * effect after the switch has saved on the device, so the record can trail the
 * screen by a request.
 */
function expectServerConsent(expected: Consent, triesLeft = POLL_TRIES): void {
  cy.gql<{ myTrackingConsent: Consent | null }>(MY_CONSENT).then(({ myTrackingConsent }) => {
    const matches =
      myTrackingConsent?.analytics === expected.analytics && myTrackingConsent?.marketing === expected.marketing;
    if (matches) return;
    if (triesLeft <= 0) {
      expect(myTrackingConsent, 'the consent the server recorded').to.deep.equal(expected);
      return;
    }
    cy.wait(POLL_MS, { log: false }).then(() => expectServerConsent(expected, triesLeft - 1));
  });
}

const switchInput = (category: 'essential' | 'analytics' | 'marketing') =>
  cy.byTestId(`consent-switch-${category}`).find('input');

/** Flip a switch and wait for the server to record the new choice. */
function flip(category: 'analytics' | 'marketing'): void {
  cy.interceptOperation('SetMyTrackingConsent');
  switchInput(category).click();
  cy.wait('@SetMyTrackingConsent');
}

describe('Privacy (GDPR)', { testIsolation: false }, () => {
  const account = runAccount();

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    declineTracking();
  });

  it('PR-01 Privacy & data shows Essential always on and the two optional switches off', () => {
    cy.visitApp('/account/privacy');
    cy.byTestId('privacy-page').should('be.visible');
    cy.byTestId('privacy-tracking-card').should('be.visible');
    switchInput('essential').should('be.checked').and('be.disabled');
    switchInput('analytics').should('not.be.checked').and('be.enabled');
    switchInput('marketing').should('not.be.checked').and('be.enabled');
    // The device's answer is the newer one, so the sync records it.
    expectServerConsent({ analytics: false, marketing: false });
  });

  it('PR-02 turning Analytics on is recorded on the server and kept after a reload', () => {
    flip('analytics');
    switchInput('analytics').should('be.checked');
    expectServerConsent({ analytics: true, marketing: false });
    cy.reload();
    switchInput('analytics').should('be.checked');
    switchInput('marketing').should('not.be.checked');
  });

  it('PR-03 turning it off again withdraws it on the server', () => {
    flip('analytics');
    switchInput('analytics').should('not.be.checked');
    expectServerConsent({ analytics: false, marketing: false });
  });

  it('PR-04 Marketing is changed on its own, without touching Analytics', () => {
    flip('marketing');
    switchInput('analytics').should('not.be.checked');
    expectServerConsent({ analytics: false, marketing: true });
    flip('marketing');
    expectServerConsent({ analytics: false, marketing: false });
  });
});
