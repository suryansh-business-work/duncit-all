import { openRow, openTable, searchTable, tableRow } from '../../support/tables';
import {
  adminRun,
  expectFieldError,
  fieldInput,
  longText,
  releaseAdmin,
  signInAdmin,
  type AdminRun,
} from '../../support/ui-admin-1';
import { countOperation, downloaded, expectNotSent, expectTableEmpty, specMarker } from '../../support/ui-staff';

/**
 * Admin › Users (/users): the `admin-users` DuncitTable over `usersTable`, and
 * the Create User dialog (portals/admin/src/pages/users-page).
 *
 * Signed in as a Support Agent (SUPPORT_USER): the directory is not held to a
 * place for that role, so the run account is always in the list. The Create
 * User dialog is driven only to its validation — creating a real account would
 * email a stranger's address and leave an account the run cannot purge.
 */

const TABLE = 'admin-users';
const USERS_TABLE = 'UsersTable';

describe('Admin · Users (Support Agent)', () => {
  let run: AdminRun;

  before(() => {
    adminRun(['SUPPORT_USER']).then((r) => {
      run = r;
    });
  });

  beforeEach(() => {
    signInAdmin(run);
  });

  after(() => releaseAdmin(run));

  it('USR-01 searching by email narrows the list to the run account; a search nothing matches shows the empty state', () => {
    const email = String(run.profile.email);
    openTable('admin', '/users', USERS_TABLE);
    searchTable(USERS_TABLE, email);
    cy.get(`@${USERS_TABLE}`).its('request.body.variables.query.search').should('eq', email);
    tableRow(TABLE, run.profile.user_id, [email]);
    cy.byTestIdPrefix(`${TABLE}-row-`).each(($row) => expect($row.text()).to.contain(email));

    openTable('admin', '/users', USERS_TABLE);
    searchTable(USERS_TABLE, specMarker(run.account, 'admin-users-none'));
    expectTableEmpty('No users match the current filters.');
  });

  it('USR-02 sorting by first name asks the server for that order; the page downloads as admin-users-page-1.csv', () => {
    openTable('admin', '/users', USERS_TABLE);
    cy.get(`@${USERS_TABLE}`).its('request.body.variables.query').should('include', { sort_by: 'created_at', sort_dir: 'desc' });
    cy.byTestId('table-sort-first_name').click();
    cy.wait(`@${USERS_TABLE}`).its('request.body.variables.query').should('include', { sort_by: 'first_name', sort_dir: 'asc' });

    // The downloaded page is the one on screen: search the run account first, so its row is in it.
    searchTable(USERS_TABLE, String(run.profile.email));
    tableRow(TABLE, run.profile.user_id, [String(run.profile.email)]);
    cy.byTestId('table-toolbar-download').click();
    cy.byTestId('table-download-page-csv').click();
    // The User column exports its value: the member's full name.
    expect(run.profile.full_name, 'the run account has a name to find in the file').to.be.a('string').and.not.be.empty;
    cy.readFile(downloaded(`${TABLE}-page-1.csv`)).should('contain', String(run.profile.full_name));
  });

  it('USR-03 a row opens that member’s details page', () => {
    openTable('admin', '/users', USERS_TABLE);
    searchTable(USERS_TABLE, String(run.profile.email));
    cy.interceptOperation('AdminUser');
    openRow(TABLE, run.profile.user_id, [String(run.profile.email)]);
    cy.location('pathname').should('eq', `/users/${run.profile.user_id}`);
    cy.wait('@AdminUser').its('response.body.data.user.user_id').should('eq', run.profile.user_id);
    cy.byTestId('back-header-title').should('have.text', run.profile.full_name || run.profile.email || run.profile.user_id);
  });

  it('USR-04 Create User validates before it sends: required fields, a bad email and an over-long city', () => {
    const creates = countOperation('CreateUser');
    openTable('admin', '/users', USERS_TABLE);
    cy.byTestId('admin-users-create').click();
    cy.byTestId('create-user-dialog').should('be.visible');
    cy.byTestId('create-user-submit').click();
    expectFieldError('create-user-first-name', 'First name is required');
    expectFieldError('create-user-last-name', 'Last name is required');
    expectFieldError('create-user-phone-number', 'Phone number must contain only digits (6-15 digits)');
    cy.byTestId('create-user-dialog').should('contain.text', 'Date of birth is required');

    fieldInput('create-user-email').type('not-an-email').blur();
    expectFieldError('create-user-email', 'Enter a valid email');
    fieldInput('create-user-city').type(longText(81), { delay: 0 }).blur();
    expectFieldError('create-user-city', 'City must be 80 characters or fewer');
    fieldInput('create-user-zone').type(longText(81), { delay: 0 }).blur();
    expectFieldError('create-user-zone', 'Zone must be 80 characters or fewer');

    cy.byTestId('create-user-submit').click();
    cy.byTestId('create-user-dialog').should('be.visible');
    cy.byTestId('create-user-cancel').click();
    cy.byTestId('create-user-dialog').should('not.exist');
    expectNotSent(creates, 'CreateUser');
  });
});
