import type { RunAccount } from '../../support/run-account';
import {
  ACCESS_DENIED,
  countOperation,
  expectNotSent,
  expectRefused,
  restoreStaffRoles,
  revokeRoles,
  staffAccount,
} from '../../support/ui-staff';
import {
  GOVERNED_NOTE,
  ZERO_ID,
  consoleLogin,
  editorShows,
  expectGovernable,
  expectGovernedReadOnly,
  firstRows,
  grantConsoleRoles,
  rawAs,
  typeInto,
} from '../../support/ui-directories';

/**
 * Club Admins console › Club admin editor (/club-admins/new,
 * /club-admins/:clubAdminId/edit). Nothing is saved: appointing grants the
 * CLUB_ADMIN role to a real account, and no role a run account may hold can
 * delete a Club Admin record. The appointment gate is proven on the server —
 * refused to the console role, and refused to a governor for an account that
 * already is one, which the service checks before it writes anything
 * (server/src/modules/clubs/clubAdminProfile/clubAdminProfile.service.ts:207-208).
 */

const CREATE = 'ClubAdminConsoleCreate';
const UPDATE = 'ClubAdminConsoleUpdate';
const ROLES = ['ALL_CLUB_ADMINS_ACCESS'] as const;

const CLUB_ADMINS_API = `query E2eClubAdminIds($query: TableQueryInput) {
  clubAdminProfilesTable(query: $query) { rows { id user_id full_name } }
}`;

const APPOINT = `mutation E2eAppointClubAdmin($user_id: ID!, $input: UpdateClubAdminProfileInput!) {
  adminCreateClubAdminProfile(user_id: $user_id, input: $input) { id }
}`;

interface ClubAdminRow {
  id: string;
  user_id: string;
  full_name: string;
}

const someClubAdmin = () =>
  firstRows<ClubAdminRow>(CLUB_ADMINS_API, 'clubAdminProfilesTable', 1).then((rows) => {
    expect(rows, 'staging lists at least one club admin').to.have.length.greaterThan(0);
    return rows[0];
  });

describe('Club Admins console · Club admin editor (run account, password CHANGED)', () => {
  let account: RunAccount;
  let token = '';

  before(() => {
    account = staffAccount();
    grantConsoleRoles(account, ROLES);
  });

  beforeEach(() => {
    consoleLogin('club-admins', account).then((t) => {
      token = t;
    });
  });

  after(() => {
    if (account) {
      revokeRoles(account, ['ONBOARDING_MANAGER']);
      restoreStaffRoles(account, ROLES);
    }
  });

  it('CAE-01 on a club admin’s record a console-role editor sees status, commission and the live switch read-only with the governed-by note', () => {
    someClubAdmin().then((admin) => {
      const updates = countOperation(UPDATE);
      cy.visitPortal('club-admins', `/club-admins/${admin.id}/edit`);
      cy.byTestId('back-header-title').should('have.text', admin.full_name || 'Edit club admin');
      expectGovernedReadOnly('club-admin-editor-commission', GOVERNED_NOTE);
      cy.byTestId('entity-editor-cancel').click();
      cy.location('pathname').should('eq', `/club-admins/${admin.id}`);
      expectNotSent(updates, UPDATE);
    });
  });

  it('CAE-02 appointing is refused to the console role by the server', () => {
    rawAs('club-admins', APPOINT, { user_id: ZERO_ID, input: {} }, token).then((body) =>
      expectRefused(body, 'adminCreateClubAdminProfile', ACCESS_DENIED),
    );
  });

  it('CAE-03 a governor’s blank appointment names the account to pick, and a commission over 100 blocks Save; phone stays optional', () => {
    grantConsoleRoles(account, ['ONBOARDING_MANAGER']);
    consoleLogin('club-admins', account);
    cy.visitPortal('club-admins', '/club-admins/new');
    cy.byTestId('back-header-title').should('have.text', 'Appoint a club admin');
    const creates = countOperation(CREATE);
    expectGovernable('club-admin-editor-commission');
    typeInto('club-admin-editor-commission', '150');
    cy.byTestId('entity-editor-save').click();
    editorShows(['Pick the Duncit account to appoint']);
    cy.byTestId('club-admin-editor-commission').should('contain.text', 'Commission must be at most 100');
    expectNotSent(creates, CREATE);
  });

  it('CAE-04 a governor appointing an account that already is a Club Admin is refused with "This account is already a Club Admin"', () => {
    grantConsoleRoles(account, ['ONBOARDING_MANAGER']);
    consoleLogin('club-admins', account).then((governorToken) => {
      someClubAdmin().then((admin) => {
        rawAs('club-admins', APPOINT, { user_id: admin.user_id, input: {} }, governorToken).then((body) =>
          expectRefused(body, 'adminCreateClubAdminProfile', 'This account is already a Club Admin'),
        );
      });
    });
  });
});
