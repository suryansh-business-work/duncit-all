import { openRow, openTable, searchTable } from '../../support/tables';
import { expectTableEmpty } from '../../support/ui-staff';
import {
  adminRaw,
  cityAdminSeat,
  denyPendingRequests,
  denyRequestApi,
  expectError,
  fileAccessRequest,
  myAccessRequests,
  releaseAdminRoles,
  signInAdmin,
  type AccessRequest,
  type AdminSeat,
} from '../../support/ui-admin-2';

/**
 * Admin › Approvals (/approvals): the cross-portal approval inbox, as a City
 * Admin (approval.resolver.ts APPROVAL_REVIEW = SUPER_ADMIN, CITY_ADMIN,
 * ZONAL_ADMIN).
 *
 * The only requests this spec may decide are its own: the run account asks
 * for two consoles it can never be given (HR, Developers — Jump to Portal
 * requests), and the spec DENIES them. Nothing is ever approved here — an
 * approval grants a role, and the server refuses a self-approval (APR-SELF). Shared requests are
 * only listed. Denying emails the requester, which is the run account itself.
 */

const TABLE = 'admin-approvals';
const DENY_PORTAL = 'hr';
const RACE_PORTAL = 'developers';
const REASON = 'Not needed for this run — filed by the staff portals suite.';
const ALREADY_REVIEWED = 'This request has already been reviewed';

function openApprovals(): void {
  openTable('admin', '/approvals', 'ApprovalRequestsTable');
}

describe('Admin · Approvals (City Admin, run account)', () => {
  let seat: AdminSeat;
  let denyTarget: AccessRequest;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
      fileAccessRequest(s.account, DENY_PORTAL).then((request) => {
        denyTarget = request;
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

  it('APR-01 the inbox opens on Pending, finds the run account’s request, and says when nothing matches', () => {
    openApprovals();
    cy.byTestId('approvals-status-PENDING').should('have.attr', 'aria-pressed', 'true');
    searchTable('ApprovalRequestsTable', seat.account.email);
    cy.byTestId(`${TABLE}-row-${denyTarget.id}`).should('be.visible');
    cy.byTestId('table-toolbar-search').clear().type(`${seat.account.email} nothing`, { delay: 0 });
    cy.wait('@ApprovalRequestsTable');
    expectTableEmpty('No approval requests match the current filters.');
  });

  it('APR-02 a denial needs a reason; confirming it says "Request denied" and stores the reason', () => {
    openApprovals();
    searchTable('ApprovalRequestsTable', seat.account.email);
    openRow(TABLE, denyTarget.id, []);
    cy.byTestId('approval-review-notes').should('not.exist');
    cy.byTestId('approval-review-deny').click();
    cy.byTestId('approval-review-deny').should('have.text', 'Confirm Deny').and('be.disabled');
    cy.byTestId('approval-review-approve').should('be.disabled');
    cy.byTestId('approval-review-notes').find('textarea').first().type(REASON, { delay: 0 });
    cy.interceptOperation('DenyRequest');
    cy.byTestId('approval-review-deny').should('be.enabled').click();
    cy.wait('@DenyRequest').its('response.body.errors').should('be.undefined');
    cy.byTestId('approvals-toast').should('contain.text', 'Request denied');
    cy.byTestId('approval-review-deny').should('not.exist');
    myAccessRequests(seat.account, DENY_PORTAL).then((rows) => {
      const row = rows.find((r) => r.id === denyTarget.id);
      expect(row?.status).to.eq('DENIED');
      expect(row?.review_notes).to.eq(REASON);
    });
  });

  it('APR-03 a reviewed request opens read-only, with who decided it and the reason', () => {
    myAccessRequests(seat.account, DENY_PORTAL).then((rows) => {
      const reviewed = rows.find((r) => r.id === denyTarget.id);
      expect(reviewed?.status, 'APR-02 denied it').to.eq('DENIED');
      openApprovals();
      cy.interceptOperation('ApprovalRequestsTable');
      cy.byTestId('approvals-status-DENIED').click();
      cy.wait('@ApprovalRequestsTable');
      searchTable('ApprovalRequestsTable', seat.account.email);
      openRow(TABLE, denyTarget.id, []);
      cy.byTestId('approval-review-decision')
        .should('contain.text', `DENIED by ${reviewed?.reviewed_by_name ?? 'Unknown'}`)
        .and('contain.text', REASON);
      cy.byTestId('approval-review-approve').should('not.exist');
      cy.byTestId('approval-review-deny').should('not.exist');
      cy.byTestId('approval-review-close').click();
      cy.byTestId('approval-review-close').should('not.exist');
    });
  });

  it('APR-04 a request reviewed elsewhere while it is open is refused with the server’s reason', () => {
    fileAccessRequest(seat.account, RACE_PORTAL).then((request) => {
      openApprovals();
      searchTable('ApprovalRequestsTable', seat.account.email);
      openRow(TABLE, request.id, []);
      cy.byTestId('approval-review-deny').click();
      cy.byTestId('approval-review-notes').find('textarea').first().type(REASON, { delay: 0 });
      // Someone else decides it first.
      denyRequestApi(request.id, 'Decided in another tab.');
      cy.interceptOperation('DenyRequest');
      cy.byTestId('approval-review-deny').click();
      cy.wait('@DenyRequest').its('response.body.errors.0.message').should('eq', ALREADY_REVIEWED);
      cy.byTestId('approval-review-error').should('have.text', ALREADY_REVIEWED);
      cy.byTestId('approvals-toast').should('not.exist');
    });
  });

  // APR-SELF: approving a PORTAL_ACCESS request grants that console's role, so the server
  // refuses a reviewer deciding their own request before anything is written or granted
  // (approval.service.ts assertMayDecide). A pending request left by an earlier run is reused.
  it('APR-SELF a reviewer cannot approve their own portal access request', () => {
    const SELF_PORTAL = 'ads';
    myAccessRequests(seat.account, SELF_PORTAL)
      .then((rows): Cypress.Chainable<AccessRequest> => {
        const pending = rows.find((r) => r.status === 'PENDING');
        return pending ? cy.wrap(pending) : fileAccessRequest(seat.account, SELF_PORTAL);
      })
      .then((request) => {
        adminRaw(`mutation E2eSelfApprove($id: ID!) { approveRequest(id: $id) { id status } }`, { id: request.id }).then(
          (body) => {
            expectError(body, 'You cannot approve your own request. Another admin has to review it');
            expect(body.errors?.[0]?.extensions?.code).to.eq('FORBIDDEN');
            expect(body.data?.approveRequest ?? null).to.be.null;
          },
        );
        myAccessRequests(seat.account, SELF_PORTAL).then((rows) => {
          expect(rows.find((r) => r.id === request.id)?.status, 'nothing was decided').to.eq('PENDING');
        });
      });
  });
});
