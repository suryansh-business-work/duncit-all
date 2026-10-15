import type { RunAccount } from '../../support/run-account';
import { RESET_DASHBOARD_API, apiToken, asAccount, openSignedIn, runPasswordNow } from '../../support/ui-shell';
import { expectConfirm, grantRoles, restoreStaffRoles, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Dashboard layout: Reset to default (ConfirmDialog →
 * `ResetDashboardLayout`) deletes this person's saved arrangement for good, a
 * reset the server refuses is reported inline, and the me-driven welcome
 * dashboard (WelcomeDashboard, mounted by the Finance console at /) greets the
 * signed-in person with their roles and account card — or shows the parsed API
 * error when `me` fails. Legal's `legal.overview` is the dashboard rearranged;
 * FINANCE_USER is granted for the welcome scenarios and removed in `after()`.
 */

const DASHBOARD = 'legal.overview';
const WIDGET = 'documents-tile';

const SAVE_LAYOUT_API = `mutation E2eSaveDashboardLayout($dashboard_id: ID!, $items: [DashboardLayoutItemInput!]!) {
  saveDashboardLayout(dashboard_id: $dashboard_id, items: $items) { dashboard_id }
}`;

describe('Portal Shell · Dashboard layout (Legal and Finance, run account)', () => {
  let account: RunAccount;

  const reset = () =>
    apiToken('legal', account).then((token) => asAccount('legal', token, RESET_DASHBOARD_API, { dashboard_id: DASHBOARD }));

  /** A saved arrangement to reset: the widget moved down a row. */
  const saveOne = () =>
    apiToken('legal', account).then((token) =>
      asAccount('legal', token, SAVE_LAYOUT_API, {
        dashboard_id: DASHBOARD,
        items: [{ widget_id: WIDGET, x: 0, y: 6, w: 3, h: 2 }],
      }),
    );

  before(() => {
    account = staffAccount();
  });

  after(() => {
    if (!account) return;
    reset();
    restoreStaffRoles(account, ['FINANCE_USER']);
  });

  it('DL-01 Reset to default asks first, deletes the saved arrangement, and the default stays after a reload', () => {
    saveOne();
    cy.apiPortalLogin('legal', account.email, runPasswordNow(account));
    cy.interceptOperation('MyDashboardLayout');
    openSignedIn('legal', '/');
    cy.wait('@MyDashboardLayout').its('response.body.data.myDashboardLayout').should('not.equal', null);
    cy.byTestId('dashboard-customise').click();
    cy.byTestId('dashboard-reset').click();
    expectConfirm('Reset this dashboard?');
    cy.byTestId('confirm-dialog-message').should(
      'contain.text',
      'Your saved arrangement is deleted and the default layout comes back. This affects only you.',
    );
    cy.interceptOperation('ResetDashboardLayout');
    cy.byTestId('confirm-dialog-confirm').click();
    cy.wait('@ResetDashboardLayout').then(({ request, response }) => {
      expect(request.body.variables.dashboard_id).to.equal(DASHBOARD);
      expect(response?.body.errors).to.be.undefined;
    });
    cy.interceptOperation('MyDashboardLayout', 'AfterReset');
    cy.reload();
    cy.wait('@AfterReset').its('response.body.data.myDashboardLayout').should('equal', null);
  });

  it('DL-02 a reset the server refuses is reported inline', () => {
    saveOne();
    cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
      if ((req.body as { operationName?: string } | undefined)?.operationName === 'ResetDashboardLayout') {
        req.reply({ statusCode: 200, body: { errors: [{ message: 'E2E: reset refused' }] } });
      }
    });
    cy.apiPortalLogin('legal', account.email, runPasswordNow(account));
    openSignedIn('legal', '/');
    cy.byTestId('dashboard-customise').click();
    cy.byTestId('dashboard-reset').click();
    cy.byTestId('confirm-dialog-confirm').click();
    cy.byTestId('app-shell-main').should('contain.text', 'Could not reset your layout. Please try again.');
  });

  it('DL-03 the welcome dashboard greets the person by first name, with their roles and account card', () => {
    grantRoles(account, ['FINANCE_USER']);
    cy.apiPortalLogin('finance', account.email, runPasswordNow(account));
    cy.interceptOperation('DashboardMe');
    openSignedIn('finance', '/');
    cy.wait('@DashboardMe').its('response.body.data.me').then((me: { first_name?: string; email: string }) => {
      cy.byTestId('app-shell-main').should('contain.text', `Welcome back, ${me.first_name || 'there'}`);
      cy.byTestId('app-shell-main').should('contain.text', 'FINANCE USER');
      cy.byTestId('account-summary-card').should('contain.text', 'Your account').and('contain.text', me.email);
    });
  });

  it('DL-04 when the account cannot be read, the welcome dashboard shows the API error instead', () => {
    grantRoles(account, ['FINANCE_USER']);
    cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
      if ((req.body as { operationName?: string } | undefined)?.operationName === 'DashboardMe') {
        req.reply({ statusCode: 200, body: { errors: [{ message: 'E2E: account unavailable' }] } });
      }
    });
    cy.apiPortalLogin('finance', account.email, runPasswordNow(account));
    openSignedIn('finance', '/');
    cy.byTestId('app-shell-main').find('.MuiAlert-standardError').should('contain.text', 'E2E: account unavailable');
    cy.byTestId('account-summary-card').should('not.exist');
  });
});
