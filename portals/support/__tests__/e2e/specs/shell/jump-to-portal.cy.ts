import type { RunAccount } from '../../support/run-account';
import { openAppsTool, openSignedIn, runPasswordNow, type PortalAccessRow } from '../../support/ui-shell';
import { grantRoles, restoreStaffRoles, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Jump to Portal (apps drawer), on Support: the dialog splits
 * every console into "Portals you can access" (links, new tab) and the locked
 * rest, as `myPortalAccess` answers — and that answer reads the account's LIVE
 * roles, so a role granted mid-session moves a console across without a new
 * sign-in. A failed load says so. LOGS_MANAGER is granted for one scenario and
 * taken away in `after()`.
 */

describe('Portal Shell · Jump to Portal (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  after(() => {
    if (account) restoreStaffRoles(account, ['LOGS_MANAGER']);
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
  });

  it('JP-01 the dialog lists the consoles the account opens as links, exactly as myPortalAccess answers', () => {
    openSignedIn('support', '/');
    cy.interceptOperation('MyPortalAccess');
    openAppsTool('jump-to-portal');
    cy.byTestId('jump-to-portal-dialog')
      .should('contain.text', 'Jump to Portal')
      .and('contain.text', 'Every Duncit console, one click away.');
    cy.wait('@MyPortalAccess').then(({ response }) => {
      const rows = (response?.body.data as { myPortalAccess: PortalAccessRow[] }).myPortalAccess;
      const open = rows.filter((row) => row.has_access);
      expect(open.map((row) => row.key), 'the three portal roles open these').to.include.members(['support', 'legal', 'pods']);
      cy.byTestIdPrefix('jump-to-portal-open-').should('have.length', open.length);
      for (const row of open) {
        cy.byTestId(`jump-to-portal-open-${row.key}`)
          .should('have.attr', 'href', row.url)
          .and('have.attr', 'target', '_blank')
          .and('contain.text', row.name);
      }
      cy.byTestId('jump-to-portal-no-access-toggle').click();
      cy.byTestIdPrefix('jump-to-portal-locked-').should('have.length', rows.length - open.length);
    });
  });

  it('JP-02 a role granted while signed in moves its console into "Portals you can access" with no new sign-in', () => {
    openSignedIn('support', '/');
    cy.interceptOperation('MyPortalAccess');
    openAppsTool('jump-to-portal');
    cy.wait('@MyPortalAccess');
    cy.byTestId('jump-to-portal-open-logs').should('not.exist');
    cy.get('body').type('{esc}');
    cy.byTestId('jump-to-portal-dialog').should('not.exist');

    grantRoles(account, ['LOGS_MANAGER']);
    cy.interceptOperation('MyPortalAccess', 'AfterGrant');
    openAppsTool('jump-to-portal');
    cy.wait('@AfterGrant');
    cy.byTestId('jump-to-portal-open-logs').should('be.visible').and('contain.text', 'Logs');
  });

  it('JP-03 a portal list that fails to load says so', () => {
    cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
      if ((req.body as { operationName?: string } | undefined)?.operationName === 'MyPortalAccess') {
        req.reply({ statusCode: 200, body: { errors: [{ message: 'E2E: portal list unavailable' }] } });
      }
    });
    openSignedIn('support', '/');
    openAppsTool('jump-to-portal');
    cy.byTestId('jump-to-portal-load-error').should('have.text', 'Could not load the portal list. Please try again.');
    cy.byTestIdPrefix('jump-to-portal-open-').should('not.exist');
  });
});
