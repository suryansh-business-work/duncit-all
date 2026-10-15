import { openTable, searchTable, tableRow } from '../../support/tables';
import { expectConfirm, expectNotify, expectTableEmpty, wideViewport } from '../../support/ui-staff';
import {
  cityAdminSeat,
  denyPendingRequests,
  denyRequestApi,
  fileAccessRequest,
  myAccessRequests,
  releaseAdminRoles,
  signInAdmin,
  type AccessRequest,
  type AdminSeat,
} from '../../support/ui-admin-2';

/**
 * Admin › Portal Access (/portal-access): the Jump to Portal request inbox —
 * the approval inbox pinned to PORTAL_ACCESS — reviewed as a City Admin.
 *
 * The run account files its own requests for two consoles it is never given
 * (Targets, Marketing) and the spec only ever DENIES them; approving would
 * grant the console's role (see KNOWN BUG APR-SELF in approvals.cy.ts, which
 * is also why "Approve portal access" is not run here). Denying emails the
 * requester — the run account itself.
 */

const TABLE = 'admin-portal-access';
const DENY_PORTAL = 'targets';
const RACE_PORTAL = 'marketing';

function openInbox(): void {
  wideViewport();
  openTable('admin', '/portal-access', 'PortalAccessRequestsTable');
}

describe('Admin · Portal Access Requests (City Admin, run account)', () => {
  let seat: AdminSeat;
  let request: AccessRequest;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
      fileAccessRequest(s.account, DENY_PORTAL).then((r) => {
        request = r;
      });
    });
  });

  beforeEach(() => {
    if (seat) signInAdmin(seat.account);
  });

  after(() => {
    if (!seat) return;
    signInAdmin(seat.account);
    denyPendingRequests(seat.account, [DENY_PORTAL, RACE_PORTAL]);
    releaseAdminRoles(seat.account);
  });

  it('PAR-01 the inbox lists only portal access requests, Pending first, each with Approve and Deny', () => {
    openInbox();
    cy.byTestId('portal-access-status-PENDING').should('have.attr', 'aria-pressed', 'true');
    searchTable('PortalAccessRequestsTable', seat.account.email);
    tableRow(TABLE, request.id, ['Targets']).within(() => {
      cy.byTestId('portal-access-approve').should('be.visible');
      cy.byTestId('portal-access-deny').should('be.visible');
    });
    cy.byTestId('table-toolbar-search').clear().type(`${seat.account.email} nothing`, { delay: 0 });
    cy.wait('@PortalAccessRequestsTable');
    expectTableEmpty('No portal access requests match the current filters.');
  });

  it('PAR-02 denying asks first, then says the requester was emailed; the row moves to Denied', () => {
    openInbox();
    searchTable('PortalAccessRequestsTable', seat.account.email);
    cy.byTestId(`${TABLE}-row-${request.id}`).find('[data-testid="portal-access-deny"]').click();
    expectConfirm('Deny portal access');
    cy.interceptOperation('DenyPortalAccess');
    cy.byTestId('confirm-dialog-confirm').click();
    cy.wait('@DenyPortalAccess').its('response.body.data.denyRequest.status').should('eq', 'DENIED');
    expectNotify('success', 'Request denied — the requester was emailed.');
    cy.byTestId(`${TABLE}-row-${request.id}`).should('not.exist');

    cy.interceptOperation('PortalAccessRequestsTable');
    cy.byTestId('portal-access-status-DENIED').click();
    cy.wait('@PortalAccessRequestsTable');
    myAccessRequests(seat.account, DENY_PORTAL).then((rows) => {
      const denied = rows.find((r) => r.id === request.id);
      expect(denied?.status).to.eq('DENIED');
      cy.byTestId(`${TABLE}-row-${request.id}`).within(() => {
        cy.byTestId('portal-access-approve').should('not.exist');
        cy.byTestId('portal-access-deny').should('not.exist');
        cy.byTestId('portal-access-reviewer').should('have.text', denied?.reviewed_by_name || '—');
      });
    });
  });

  it('PAR-03 a request already reviewed elsewhere is refused: "This request has already been reviewed"', () => {
    fileAccessRequest(seat.account, RACE_PORTAL).then((race) => {
      openInbox();
      searchTable('PortalAccessRequestsTable', seat.account.email);
      cy.byTestId(`${TABLE}-row-${race.id}`).find('[data-testid="portal-access-deny"]').click();
      expectConfirm('Deny portal access');
      denyRequestApi(race.id, 'Decided in another tab.');
      cy.interceptOperation('DenyPortalAccess');
      cy.byTestId('confirm-dialog-confirm').click();
      cy.wait('@DenyPortalAccess')
        .its('response.body.errors.0.message')
        .should('eq', 'This request has already been reviewed');
      expectNotify('error', 'This request has already been reviewed');
    });
  });
});
