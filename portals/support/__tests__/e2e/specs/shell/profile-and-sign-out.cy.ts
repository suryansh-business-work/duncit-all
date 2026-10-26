import type { RunAccount } from '../../support/run-account';
import {
  ME_BASICS,
  apiToken,
  asAccount,
  fieldHelper,
  openSignedIn,
  restoreProfile,
  runPasswordNow,
  storedToken,
  type MeBasics,
} from '../../support/ui-shell';
import { countOperation, expectNotSent, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Profile and sign out, on Support: the avatar menu opens
 * Profile and Logout, the profile lists the roles the account holds, the name
 * is edited through `ShellUpdateMyProfile` with the shared name rules, and
 * Logout drops the console's session. The run account's own name is the only
 * thing written, and `after()` writes back what `me` answered first.
 *
 * Not driven: the catalogue's "No roles assigned." line — an account with no
 * role cannot be inside a console to read it.
 */

const STAFF_ROLE_CHIPS: readonly [string, string][] = [
  ['SUPPORT_MANAGER', 'Support Manager'],
  ['LEGAL_MANAGER', 'Legal Manager'],
  ['ALL_PODS_ACCESS', 'All Pods Access'],
];

describe('Portal Shell · Profile and sign out (Support, run account)', () => {
  let account: RunAccount;
  let original: MeBasics | null = null;

  before(() => {
    account = staffAccount();
    apiToken('support', account).then((token) =>
      asAccount<{ me: MeBasics }>('support', token, ME_BASICS).then((data) => {
        original = data.me;
      }),
    );
  });

  after(() => {
    if (!account || !original) return;
    const me = original;
    apiToken('support', account).then((token) => restoreProfile('support', token, me));
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
  });

  it('PSO-01 the avatar opens Profile and Logout; Profile lists the roles the account holds', () => {
    openSignedIn('support', '/');
    cy.byTestId('shell-user-menu-button').click().should('have.attr', 'aria-expanded', 'true');
    cy.byTestId('shell-user-menu-profile').should('contain.text', 'Profile');
    cy.byTestId('shell-user-menu-logout').should('contain.text', 'Logout');
    cy.byTestId('shell-user-menu-profile').click();
    cy.location('pathname').should('eq', '/profile');
    cy.byTestId('profile-roles').should('contain.text', 'Access roles');
    for (const [role, label] of STAFF_ROLE_CHIPS) cy.byTestId(`profile-role-${role}`).should('have.text', label);
  });

  it('PSO-02 the name form refuses a blank or malformed first name before saving, then saves a valid one', () => {
    const save = countOperation('ShellUpdateMyProfile');
    openSignedIn('support', '/profile');
    cy.byTestId('account-edit').click();
    cy.byTestId('field-first_name').clear().blur();
    fieldHelper('profile-details-form').should('contain.text', 'First name is required');
    cy.byTestId('account-edit-submit').click();
    cy.byTestId('field-first_name').type('R2D2');
    cy.byTestId('profile-details-form').should('contain.text', 'First name can use letters, spaces, apostrophes and periods only');
    cy.byTestId('account-edit-submit').click();
    expectNotSent(save, 'ShellUpdateMyProfile');

    cy.byTestId('field-first_name').clear().type('Shelltest');
    cy.interceptOperation('ShellUpdateMyProfile');
    cy.byTestId('account-edit-submit').click();
    cy.wait('@ShellUpdateMyProfile').then(({ request, response }) => {
      expect(request.body.variables.input.first_name).to.equal('Shelltest');
      expect(response?.body.errors).to.be.undefined;
    });
    cy.byTestId('profile-saved').should('have.text', 'Profile updated.');
    cy.byTestId('profile-details-form').should('not.exist');
    cy.byTestId('shell-user-menu-button').should('contain.text', 'Shelltest');
  });

  it('PSO-03 a save that cannot reach the server shows its error under the fields and keeps them open', () => {
    cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
      if ((req.body as { operationName?: string } | undefined)?.operationName === 'ShellUpdateMyProfile') {
        req.reply({ forceNetworkError: true });
      }
    });
    openSignedIn('support', '/profile');
    cy.byTestId('account-edit').click();
    cy.byTestId('field-first_name').clear().type('Shellfail');
    cy.byTestId('account-edit-submit').click();
    // The Apollo RetryLink retries a transport failure before giving up.
    cy.byTestId('account-edit-error', { timeout: 40000 }).should('be.visible').invoke('text').should('not.be.empty');
    cy.byTestId('profile-details-form').should('be.visible');
    cy.byTestId('field-first_name').should('have.value', 'Shellfail');
  });

  it('PSO-04 Logout in the header menu drops the session; the protected page then asks for a sign-in again', () => {
    openSignedIn('support', '/profile');
    cy.byTestId('shell-user-menu-button').click();
    cy.byTestId('shell-user-menu-logout').click();
    cy.location('pathname').should('eq', '/login');
    cy.byTestId('login-screen').should('be.visible');
    storedToken('support').should('equal', null);
    cy.window().its('localStorage').invoke('getItem', 'support_user').should('equal', null);

    cy.clearAuth();
    cy.visitPortal('support', '/profile');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', '?redirect=%2Fprofile');
  });
});
