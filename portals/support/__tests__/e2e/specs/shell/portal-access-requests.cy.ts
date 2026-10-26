import type { RunAccount } from '../../support/run-account';
import { openAppsTool, openSignedIn, runPasswordNow, type PortalAccessRow } from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Portal access requests (Jump to Portal's locked half), on
 * Support. Each locked console's row says what the server says about it:
 * "Requested" while a request is PENDING, "Request access" when one may be
 * filed, "Granted personally by a super admin." when none may (Admin), and the
 * declined hint after a DENIED one. A refused request surfaces in a
 * dismissable alert.
 *
 * No real request is filed: that would create a PENDING approval for a super
 * admin to decide, which this suite cannot remove. The refusal scenario
 * answers `RequestPortalAccess` itself, so nothing reaches the server.
 */

function rowsOf(response: { body: { data?: unknown } } | undefined): PortalAccessRow[] {
  return (response?.body.data as { myPortalAccess: PortalAccessRow[] }).myPortalAccess;
}

describe('Portal Shell · Portal access requests (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
  });

  it('PAR-01 every locked console shows the action its request status allows', () => {
    openSignedIn('support', '/');
    cy.interceptOperation('MyPortalAccess');
    openAppsTool('jump-to-portal');
    cy.wait('@MyPortalAccess').then(({ response }) => {
      const locked = rowsOf(response).filter((row) => !row.has_access);
      if (locked.length === 0) throw new Error('The run account can open every console; there is no locked row to check.');
      cy.byTestId('jump-to-portal-no-access-toggle').click();
      cy.byTestId('jump-to-portal-dialog').should('contain.text', 'Request access and a super admin will review it from the Admin console.');
      for (const row of locked) {
        const el = () => cy.byTestId(`jump-to-portal-locked-${row.key}`);
        el().should('contain.text', row.name);
        if (row.request_status === 'PENDING') {
          el().should('contain.text', 'Requested').and('contain.text', 'Waiting for an admin decision.');
          cy.byTestId(`jump-to-portal-request-${row.key}`).should('not.exist');
        } else if (row.can_request) {
          cy.byTestId(`jump-to-portal-request-${row.key}`).should('be.enabled').and('have.text', 'Request access');
          if (row.request_status === 'DENIED') el().should('contain.text', 'Your last request was declined — you can ask again.');
        } else {
          el().should('contain.text', 'Granted personally by a super admin.');
          cy.byTestId(`jump-to-portal-request-${row.key}`).should('not.exist');
        }
      }
      // portalAccess.service.ts NON_REQUESTABLE: the Admin console is never self-requested.
      const admin = locked.find((row) => row.key === 'admin');
      if (admin) expect(admin.can_request, 'Admin can be requested').to.equal(false);
    });
  });

  it('PAR-02 a refused request is shown in an alert that can be dismissed, and the row stays requestable', () => {
    cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
      if ((req.body as { operationName?: string } | undefined)?.operationName === 'RequestPortalAccess') {
        req.alias = 'RequestPortalAccess';
        req.reply({ statusCode: 200, body: { errors: [{ message: 'E2E: request refused' }] } });
      }
    });
    openSignedIn('support', '/');
    cy.interceptOperation('MyPortalAccess');
    openAppsTool('jump-to-portal');
    cy.wait('@MyPortalAccess').then(({ response }) => {
      const target = rowsOf(response).find((row) => !row.has_access && row.can_request && row.request_status !== 'PENDING');
      if (!target) throw new Error('No locked console the run account may request; the refusal path cannot be reached.');
      cy.byTestId('jump-to-portal-no-access-toggle').click();
      cy.byTestId(`jump-to-portal-request-${target.key}`).click();
      cy.wait('@RequestPortalAccess').its('request.body.variables').should('deep.equal', { portal_key: target.key });
      cy.byTestId('jump-to-portal-request-error').should('contain.text', 'E2E: request refused');
      cy.byTestId('jump-to-portal-request-error').find('button').click();
      cy.byTestId('jump-to-portal-request-error').should('not.exist');
      cy.byTestId(`jump-to-portal-request-${target.key}`).should('be.enabled');
    });
  });
});
