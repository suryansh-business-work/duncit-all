import type { RunAccount } from '../../support/run-account';
import { openTable, searchTable } from '../../support/tables';
import {
  ACCESS_DENIED,
  expectRefused,
  expectTableEmpty,
  restoreStaffRoles,
  revokeRoles,
  specMarker,
  staffAccount,
} from '../../support/ui-staff';
import { ZERO_ID, consoleLogin, grantConsoleRoles, rawAs, supportToken } from '../../support/ui-directories';

/**
 * Clubs console › Club slot requests (/club-admin-requests, "Requests for Club
 * Admins"): hosts asking a club's admins to open venue slots.
 *
 * Mark resolved is never pressed — each request is a real host's, and closing
 * it messages the club's admins. The list, its search and its links are read,
 * and the resolve gate is asked of the server on an id nobody has.
 */

const LIST = 'ClubSlotRequestsTable';
const ROLES = ['ALL_CLUBS_ACCESS'] as const;
const RESOLVE = `mutation E2eResolveSlotRequest($id: ID!) { resolveClubSlotRequest(id: $id) { id } }`;

describe('Clubs console · Club slot requests (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
    grantConsoleRoles(account, ROLES);
  });

  beforeEach(() => {
    consoleLogin('clubs', account);
  });

  after(() => {
    if (account) restoreStaffRoles(account, ROLES);
  });

  it('CSR-01 the requests page lists through clubSlotRequestsTable, and a search matching nothing reads "No requests yet."', () => {
    openTable('clubs', '/club-admin-requests', LIST);
    cy.byTestId('club-slot-requests-page').should('be.visible');
    cy.byTestId('page-header-title').should('have.text', 'Requests for Club Admins');
    searchTable(LIST, `${specMarker(account, 'club-requests')} nobody asked this`);
    expectTableEmpty('No requests yet.');
  });

  it('CSR-02 a request’s club name opens that club’s record', () => {
    cy.interceptOperation(LIST);
    cy.visitPortal('clubs', '/club-admin-requests');
    cy.wait(`@${LIST}`).then(({ response }) => {
      expect(response?.body.errors).to.be.undefined;
      const [request] = (response?.body.data.clubSlotRequestsTable.rows ?? []) as { id: string; club_id: string }[];
      expect(request, 'staging holds at least one club slot request').to.exist;
      cy.byTestId(`club-slot-request-club-${request.id}`).click();
      cy.location('pathname').should('eq', `/clubs/${request.club_id}`);
    });
  });

  it('CSR-03 resolving is refused to staff without a clubs console role', () => {
    // Roles travel in every token, so the role goes first.
    revokeRoles(account, ROLES);
    supportToken(account).then((token) => {
      rawAs('clubs', RESOLVE, { id: ZERO_ID }, token).then((body) =>
        expectRefused(body, 'resolveClubSlotRequest', ACCESS_DENIED),
      );
    });
    grantConsoleRoles(account, ROLES);
  });
});
