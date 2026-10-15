import type { RunAccount } from '../../support/run-account';
import {
  MAIL_PREFERENCES_API,
  ME_BASICS,
  SET_MAIL_PREFERENCE_API,
  SET_VISIBILITY_API,
  apiToken,
  asAccount,
  openSignedIn,
  restoreProfile,
  runPasswordNow,
  type MeBasics,
} from '../../support/ui-shell';
import { countOperation, expectNotSent, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Profile (the shared ProfilePage, on Support): Log out at the
 * foot of the identity card, the Details tab (bio and links, RHF + Zod, and the
 * private-profile switch) and the Notifications tab's email switches. Each
 * write is the run account's own preference, put back in `after()`.
 */

interface MailSheet {
  myMailPreferences: { email: string; categories: { category: string; required: boolean; enabled: boolean }[] };
}

describe('Portal Shell · Profile (Support, run account)', () => {
  let account: RunAccount;
  let original: MeBasics | null = null;
  let mail: MailSheet['myMailPreferences'] | null = null;

  before(() => {
    account = staffAccount();
    apiToken('support', account).then((token) => {
      asAccount<{ me: MeBasics }>('support', token, ME_BASICS).then((data) => {
        original = data.me;
      });
      asAccount<MailSheet>('support', token, MAIL_PREFERENCES_API).then((data) => {
        mail = data.myMailPreferences;
      });
    });
  });

  after(() => {
    if (!account) return;
    const me = original;
    const sheet = mail;
    apiToken('support', account).then((token) => {
      if (me) {
        restoreProfile('support', token, me);
        asAccount('support', token, SET_VISIBILITY_API, { visibility: me.profile_visibility ?? 'PUBLIC' });
      }
      for (const row of sheet?.categories.filter((c) => !c.required) ?? []) {
        asAccount('support', token, SET_MAIL_PREFERENCE_API, { category: row.category, enabled: row.enabled });
      }
    });
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
  });

  it('PR-01 Log out on the profile page clears every stored value and shows the login screen', () => {
    openSignedIn('support', '/profile');
    cy.window().then((win) => win.sessionStorage.setItem('e2e-marker', 'set'));
    cy.byTestId('profile-logout').should('have.text', 'Log out').click();
    cy.location('pathname').should('eq', '/login');
    cy.byTestId('login-screen').should('be.visible');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('support_token'), 'the token').to.equal(null);
      expect(win.localStorage.getItem('support_user'), 'the cached user').to.equal(null);
      expect(win.sessionStorage.getItem('e2e-marker'), 'session storage').to.equal(null);
    });
  });

  it('PR-02 a link needs a label and a real URL before the details save; a valid one is saved and shown', () => {
    const save = countOperation('ShellUpdateMyProfile');
    openSignedIn('support', '/profile');
    cy.byTestId('account-edit').click();
    cy.byTestId('profile-link-url-0').find('input').clear().type('not a url');
    cy.byTestId('profile-link-label-0').find('input').clear();
    cy.byTestId('account-edit-submit').click();
    cy.byTestId('profile-link-label-0').should('contain.text', 'Label is required');
    cy.byTestId('profile-link-url-0').should('contain.text', 'Enter a valid URL');
    expectNotSent(save, 'ShellUpdateMyProfile');

    cy.byTestId('profile-link-label-0').find('input').type('E2E site');
    cy.byTestId('profile-link-url-0').find('input').clear().type('https://example.com/e2e');
    cy.byTestId('field-bio').clear().type(`Shell spec ${account.stamp}`);
    cy.interceptOperation('ShellUpdateMyProfile');
    cy.byTestId('account-edit-submit').click();
    cy.wait('@ShellUpdateMyProfile').its('request.body.variables.input').should((input) => {
      expect(input.bio).to.equal(`Shell spec ${account.stamp}`);
      expect(input.profile_links[0]).to.deep.equal({ label: 'E2E site', url: 'https://example.com/e2e' });
    });
    cy.byTestId('profile-saved').should('have.text', 'Profile updated.');
    cy.byTestId('profile-bio').should('have.text', `Shell spec ${account.stamp}`);
    cy.byTestId('profile-about').contains('a', 'E2E site').should('have.attr', 'href', 'https://example.com/e2e');
  });

  it('PR-03 the private-profile switch is saved and still set after a reload', () => {
    openSignedIn('support', '/profile');
    cy.byTestId('profile-visibility-switch').find('input[type="checkbox"]').then(($box) => {
      const wasPrivate = $box.prop('checked') === true;
      cy.interceptOperation('ShellSetProfileVisibility');
      cy.wrap($box).click();
      cy.wait('@ShellSetProfileVisibility')
        .its('response.body.data.updateMyProfileVisibility.profile_visibility')
        .should('eq', wasPrivate ? 'PUBLIC' : 'PRIVATE');
      cy.reload();
      cy.byTestId('profile-visibility-switch').find('input[type="checkbox"]').should(wasPrivate ? 'not.be.checked' : 'be.checked');
    });
  });

  it('PR-04 an email category switched off on the Notifications tab stays off after a reload; required ones are locked', () => {
    const sheet = mail;
    if (!sheet) throw new Error('myMailPreferences did not answer for the run account.');
    const optional = sheet.categories.find((c) => !c.required && c.enabled) ?? sheet.categories.find((c) => !c.required);
    if (!optional) throw new Error('No switchable email category is configured on staging.');
    openSignedIn('support', '/profile?selectedtab=notifications');
    cy.byTestId('profile-mail-preferences').should('contain.text', sheet.email);
    for (const locked of sheet.categories.filter((c) => c.required)) {
      cy.byTestId(`mail-preference-${locked.category}`).find('input[type="checkbox"]').should('be.disabled').and('be.checked');
    }
    cy.interceptOperation('ShellSetMyMailPreference');
    cy.byTestId(`mail-preference-${optional.category}`).find('input[type="checkbox"]').click();
    cy.wait('@ShellSetMyMailPreference').its('request.body.variables').should('deep.equal', {
      category: optional.category,
      enabled: !optional.enabled,
    });
    cy.reload();
    cy.byTestId(`mail-preference-${optional.category}`)
      .find('input[type="checkbox"]')
      .should(optional.enabled ? 'not.be.checked' : 'be.checked');
  });
});
