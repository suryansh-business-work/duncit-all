/// <reference types="cypress" />
import { sendCode } from '../../../support/account-steps';
import { signInRunMember } from '../../../support/access-steps';
import { openAccount } from '../../../support/profile-steps';

/**
 * Communication preferences, live on staging, on the run account's own sheet.
 * Every switch a scenario turns is turned back (or, for the bulk action, back
 * ON — the state a new account starts in) before it ends.
 *
 * The hub (/account/communication) only navigates; Mail Preference
 * (/account/mail-preference) writes. An opt-out is confirmed by email, so its
 * snackbar says so; an opt-in is not (useMailPreferences.ts).
 */

const MAIL_QUERY = `query E2eMailSheet { myMailPreferences { categories { category required enabled } } }`;

interface MailCategory {
  category: string;
  required: boolean;
  enabled: boolean;
}

const SAVED = 'Preferences updated';
const CONFIRMATION = 'We have emailed you a confirmation.';

const mailSheet = () =>
  cy.gql<{ myMailPreferences: { categories: MailCategory[] } }>(MAIL_QUERY).then((data) => data.myMailPreferences.categories);

const mailSwitch = (category: string) => cy.byTestId(`mail-preference-switch-${category}`);
const snackbar = () => cy.byTestId('mail-preference-page-snackbar');

function openMailPreference(): void {
  cy.interceptOperation('MyMailPreferences');
  cy.visitApp('/account/mail-preference');
  cy.wait('@MyMailPreferences');
  cy.byTestId('mail-preference-page').should('be.visible');
}

/** Turn one category's switch and wait for the server to store it. */
function setCategory(category: string, enabled: boolean): void {
  sendCode('SetMyMailPreference', () => {
    mailSwitch(category).click();
  });
  mailSwitch(category).should(enabled ? 'be.checked' : 'not.be.checked');
}

describe('UI Communication preferences', () => {
  before(() => {
    signInRunMember();
  });

  it('CP-01 the single Communication Preferences row opens the channel list, and Email opens Mail Preference', () => {
    openAccount();
    cy.byTestId('comm-preference-entry').should('contain.text', 'Communication Preferences').click();
    cy.location('pathname').should('eq', '/account/communication');
    cy.byTestId('comm-channel-EMAIL').should('be.visible');
    cy.byTestId('comm-channel-WHATSAPP').should('be.visible');
    cy.byTestId('comm-channel-SMS').should('be.visible');
    cy.byTestId('comm-channel-EMAIL').click();
    cy.location('pathname').should('eq', '/account/mail-preference');
    cy.byTestId('mail-preference-page-title').should('have.text', 'Mail Preference');
  });

  it('CP-02 an optional email category switches off with a confirmation and back on without one; required ones are locked', () => {
    mailSheet().then((categories) => {
      const optional = categories.find((row) => !row.required);
      const required = categories.find((row) => row.required);
      if (!optional || !required) throw new Error('The mail sheet must list optional and required categories.');
      openMailPreference();
      mailSwitch(required.category).should('be.disabled').and('be.checked');
      if (!optional.enabled) setCategory(optional.category, true);
      setCategory(optional.category, false);
      snackbar().should('contain.text', SAVED).and('contain.text', CONFIRMATION);
      setCategory(optional.category, true);
      snackbar().should('contain.text', SAVED).and('not.contain.text', CONFIRMATION);
      mailSheet().then((after) => {
        expect(after.find((row) => row.category === optional.category)?.enabled, 'stored as on').to.equal(true);
      });
    });
  });

  it('CP-03 Unsubscribe from everything optional asks first, then Turn everything back on restores them without asking', () => {
    mailSheet().then((categories) => {
      const optional = categories.filter((row) => !row.required).map((row) => row.category);
      openMailPreference();
      cy.byTestId('mail-preference-page-bulk-button').then(($button) => {
        // An account left with everything off starts from the opt-back-in half.
        if ($button.text().includes('Turn everything back on')) {
          sendCode('SetAllMyMailPreferences', () => {
            cy.byTestId('mail-preference-page-bulk-button').click();
          });
        }
      });
      cy.byTestId('mail-preference-page-bulk-button').should('have.text', 'Unsubscribe from everything optional').click();
      cy.byTestId('mail-preference-confirm-title').should('have.text', 'Stop all optional email?');
      sendCode('SetAllMyMailPreferences', () => {
        cy.byTestId('mail-preference-confirm-confirm').click();
      });
      cy.byTestId('mail-preference-confirm').should('not.exist');
      optional.forEach((category) => mailSwitch(category).should('not.be.checked'));
      sendCode('SetAllMyMailPreferences', () => {
        cy.byTestId('mail-preference-page-bulk-button').should('have.text', 'Turn everything back on').click();
      });
      cy.byTestId('mail-preference-confirm').should('not.exist');
      optional.forEach((category) => mailSwitch(category).should('be.checked'));
      cy.byTestId('mail-preference-page-bulk-button').should('have.text', 'Unsubscribe from everything optional');
    });
  });

  it('CP-04 an unsubscribe link the server cannot verify says so and offers sign-in', () => {
    cy.clearAuth();
    cy.interceptOperation('MailPreferencesByToken');
    cy.visitApp('/unsubscribe?e=e2e-not-an-address&t=e2e-not-a-signature');
    cy.wait('@MailPreferencesByToken');
    cy.byTestId('mail-preference-page-invalid-link-alert').should(
      'have.text',
      'This unsubscribe link is no longer valid. Sign in and open Mail Preference from your profile instead.',
    );
    cy.byTestId('mail-preference-page-sign-in-button').should('have.text', 'Sign in to manage preferences').click();
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent('/account/mail-preference')}`);
  });
});
