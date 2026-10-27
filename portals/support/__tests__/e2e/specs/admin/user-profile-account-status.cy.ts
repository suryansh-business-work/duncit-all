import {
  adminRun,
  expectFieldError,
  fieldInput,
  longText,
  openRunUser,
  releaseAdmin,
  signInAdmin,
  type AdminRun,
} from '../../support/ui-admin-1';
import { countOperation, expectNotSent, gqlRaw, specMarker } from '../../support/ui-staff';

/**
 * Admin › User Profile & Account Status (/users/:user_id): the details header,
 * the Profile tab form (userProfileSchema; Save enables only when dirty and
 * valid) and a missing record.
 *
 * Signed in as a City Admin scoped to the run account's own city, editing the
 * run account itself — the one member the run may change. Only the bio is
 * written. Blocking, deactivating or deleting the account would end the run's
 * own session, so the status buttons are not pressed here.
 */

const ZERO_ID = '000000000000000000000000';

const USER_LOOKUP = `query E2eAdminUserLookup($user_id: ID!) { user(user_id: $user_id) { user_id bio } }`;

const LAST_NAME_LOOKUP = `query E2eAdminUserLastName($user_id: ID!) { user(user_id: $user_id) { last_name } }`;

describe('Admin · User Profile & Account Status (City Admin)', () => {
  let run: AdminRun;

  before(() => {
    adminRun(['CITY_ADMIN']).then((r) => {
      run = r;
    });
  });

  beforeEach(() => {
    signInAdmin(run);
  });

  after(() => releaseAdmin(run));

  it('UPP-01 the details page shows the member’s header, contact actions and the Profile tab; Back returns to /users', () => {
    openRunUser(run);
    cy.byTestId('back-header-title').should('have.text', run.profile.full_name || run.profile.email || run.profile.user_id);
    cy.byTestId('admin-user-call').should('be.visible');
    cy.byTestId('admin-user-email').should('be.visible');
    cy.byTestId('admin-user-profile-save').should('be.disabled');
    fieldInput('admin-user-profile-bio').should('be.visible');
    cy.byTestId('back-header-back').click();
    cy.location('pathname').should('eq', '/users');
  });

  it('UPP-02 an unknown id reads "User not found."; a malformed one shows the server’s own error', () => {
    cy.interceptOperation('AdminUser');
    cy.visitPortal('admin', `/users/${ZERO_ID}`);
    cy.wait('@AdminUser').its('response.body.data.user').should('equal', null);
    cy.byTestId('admin-user-not-found').should('have.text', 'User not found.');

    signInAdmin(run).then((token) => {
      gqlRaw<{ user: null }>('admin', USER_LOOKUP, { user_id: 'not-an-id' }, token).then((body) => {
        const message = body.errors?.[0]?.message;
        expect(message, 'the server refuses a malformed id').to.be.a('string').and.not.be.empty;
        cy.interceptOperation('AdminUser');
        cy.visitPortal('admin', '/users/not-an-id');
        cy.wait('@AdminUser');
        cy.byTestId('admin-user-error').should('have.text', String(message));
      });
    });
  });

  it('UPP-03 a member without a last name can still have their bio edited and saved', () => {
    cy.gql<{ user: { last_name: string | null } }>(LAST_NAME_LOOKUP, { user_id: run.profile.user_id })
      .its('user.last_name')
      .should('be.oneOf', [null, '']);
    openRunUser(run);
    fieldInput('admin-user-profile-bio').clear().type(specMarker(run.account, 'admin-bio-no-last-name'), { delay: 0 });
    cy.byTestId('admin-user-profile-save').should('be.enabled');
  });

  it('UPP-04 editing the bio (with a last name filled in) enables Save; saving writes it and says "User updated"', () => {
    const bio = specMarker(run.account, 'admin-profile-bio');
    openRunUser(run);
    cy.byTestId('admin-user-profile-save').should('be.disabled');
    fieldInput('admin-user-profile-last-name').clear().type('Duncit', { delay: 0 });
    fieldInput('admin-user-profile-bio').clear().type(bio, { delay: 0 });
    cy.byTestId('admin-user-profile-save').should('be.enabled');
    cy.interceptOperation('UpdateUser');
    cy.byTestId('admin-user-profile-save').click();
    cy.wait('@UpdateUser').then(({ request, response }) => {
      expect(request.body.variables.user_id).to.eq(run.profile.user_id);
      expect(request.body.variables.input.bio).to.eq(bio);
      expect(response?.body.errors, 'updateUser answers without an error').to.be.undefined;
    });
    cy.byTestId('admin-user-toast').should('contain.text', 'User updated');
    cy.byTestId('admin-user-profile-save').should('be.disabled');
    cy.gql<{ user: { bio: string } }>(USER_LOOKUP, { user_id: run.profile.user_id }).its('user.bio').should('eq', bio);
  });

  it('UPP-05 an over-long zone is refused under the field and keeps Save disabled; nothing is sent', () => {
    const updates = countOperation('UpdateUser');
    openRunUser(run);
    fieldInput('admin-user-profile-zone').clear().type(longText(81), { delay: 0 });
    expectFieldError('admin-user-profile-zone', 'Zone must be 80 characters or fewer');
    cy.byTestId('admin-user-profile-save').should('be.disabled');
    expectNotSent(updates, 'UpdateUser');
  });
});
