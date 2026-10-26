import type { RunAccount } from '../../support/run-account';
import {
  ACCESS_DENIED,
  countOperation,
  expectNotSent,
  restoreStaffRoles,
  specMarker,
  staffAccount,
} from '../../support/ui-staff';
import { consoleLogin, firstRows, grantConsoleRoles, typeInto } from '../../support/ui-directories';

/**
 * Clubs console › Club editor (/clubs/new, /clubs/:id/edit) — @duncit/club-form
 * inside the console's page.
 *
 * createClub and updateClub are SUPER_ADMIN / CITY_ADMIN
 * (server/src/modules/clubs/club/club.resolver.ts:10), so ALL_CLUBS_ACCESS can
 * open the editor but not save it. The draft this spec tries to save is named
 * with the run's marker, so even if the server ever accepted it, the run's purge
 * removes it (clubs named `[E2E <stamp> …]`, e2eRun.purge.ts) — and
 * `grantConsoleRoles` fails the spec first if the account holds a role that could.
 */

const ROLES = ['ALL_CLUBS_ACCESS'] as const;
const CLUBS_API = `query E2eClubIds($query: TableQueryInput) { clubsTable(query: $query) { rows { id club_name } } }`;

describe('Clubs console · Club editor (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = staffAccount();
    grantConsoleRoles(account, ROLES);
    marker = specMarker(account, 'clubs-editor');
  });

  beforeEach(() => {
    consoleLogin('clubs', account);
  });

  after(() => {
    if (account) restoreStaffRoles(account, ROLES);
  });

  it('CE-01 Save waits for a name, then shows every missing required field and a malformed link, and sends nothing', () => {
    cy.visitPortal('clubs', '/clubs/new');
    cy.byTestId('club-editor-heading').should('have.text', 'New Club');
    const creates = countOperation('CreateClub');
    cy.byTestId('club-form-save').should('be.disabled');
    typeInto('club-form-name', `${marker} validation`);
    cy.byTestId('club-form-save').should('be.enabled').click();
    cy.byTestId('club-form').should(($form) => {
      for (const message of [
        'A short description is required',
        'Select the club location',
        'WhatsApp community link is required',
        'Assign a Club Admin',
      ]) {
        expect($form).to.contain.text(message);
      }
    });
    typeInto('club-form-community-link', 'not-a-link');
    cy.byTestId('club-form-save').click();
    cy.byTestId('club-form-community-link').should('contain.text', 'Enter a valid link (https://…)');
    expectNotSent(creates, 'CreateClub');
    cy.location('pathname').should('eq', '/clubs/new');
  });

  it('CE-02 a draft skips the form rules, and the server refuses it to the console role: the editor shows "Access Denied" and stays put', () => {
    cy.visitPortal('clubs', '/clubs/new');
    typeInto('club-form-name', `${marker} draft`);
    cy.interceptOperation('CreateClub');
    cy.byTestId('club-form-draft').should('have.text', 'Save as Draft').click();
    cy.wait('@CreateClub').then(({ request, response }) => {
      expect(request.body.variables.input.club_name).to.eq(`${marker} draft`);
      expect(response?.body.errors?.[0]?.message).to.eq(ACCESS_DENIED);
    });
    cy.byTestId('club-form-error').should('have.text', ACCESS_DENIED);
    cy.location('pathname').should('eq', '/clubs/new');
  });

  it('CE-03 editing a club offers Cancel and Save only — no Save as Draft — and Cancel returns to /clubs without saving', () => {
    firstRows<{ id: string; club_name: string }>(CLUBS_API, 'clubsTable', 1).then(([club]) => {
      expect(club, 'staging lists at least one club').to.exist;
      const updates = countOperation('UpdateClub');
      cy.visitPortal('clubs', `/clubs/${club.id}/edit`);
      cy.byTestId('club-editor-heading').should('have.text', 'Edit Club');
      cy.byTestId('club-form-name').find('input').should('have.value', club.club_name);
      cy.byTestId('club-form-draft').should('not.exist');
      cy.byTestId('club-form-save').should('exist');
      cy.byTestId('club-form-cancel').click();
      cy.location('pathname').should('eq', '/clubs');
      expectNotSent(updates, 'UpdateClub');
    });
  });
});
