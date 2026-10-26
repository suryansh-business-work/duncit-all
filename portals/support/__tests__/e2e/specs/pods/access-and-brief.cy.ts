import { grantStaffRoles, type RunAccount } from '../../support/run-account';
import {
  ACCESS_DENIED,
  PORTAL_REFUSED,
  apiLoginRaw,
  expectDeniedBanner,
  expectRefused,
  expectUiLoginRefused,
  gqlRaw,
  restoreStaffRoles,
  revokeRoles,
  staffAccount,
} from '../../support/ui-staff';

/**
 * Pods Portal › Access & brief: who may open pods.duncit.com, and the brief at
 * `/` — four lifecycle tiles, each a way into All Pods.
 *
 * The refusals take ALL_PODS_ACCESS away from the run account (it keeps
 * SUPPORT_MANAGER and LEGAL_MANAGER, other staff roles); the scenario after
 * them gives it back, and `after()` makes sure of it.
 */

const POD_DASHBOARD = `query E2ePodDashboard { podDashboard(days: 30) { totals { total } } }`;

/** Click a brief tile and land on All Pods with its query. */
function openTile(key: string, search: string): void {
  cy.visitPortal('pods', '/');
  cy.byTestId(`directory-tile-${key}`).click();
  cy.location('pathname').should('eq', '/pods');
  cy.location('search').should('eq', search);
  cy.byTestId('pods-list-title').should('have.text', 'Pods');
}

describe('Pods Portal · Access & brief (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  after(() => {
    if (account) restoreStaffRoles(account);
  });

  it('PAB-01 the brief shows the four lifecycle tiles, and each opens All Pods already filtered by lifecycle', () => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
    cy.visitPortal('pods', '/');
    cy.byTestId('page-header-title').should('have.text', 'Pods');
    cy.byTestId('directory-tile-total').should('contain.text', 'Total');
    cy.byTestId('directory-tile-upcoming').should('contain.text', 'Upcoming');
    cy.byTestId('directory-tile-ongoing').should('contain.text', 'Running now');
    cy.byTestId('directory-tile-completed').should('contain.text', 'Completed');

    openTile('upcoming', '?lifecycle=UPCOMING');
    openTile('ongoing', '?lifecycle=ONGOING');
    openTile('completed', '?lifecycle=COMPLETED');
    openTile('total', '');
  });

  it('PAB-02 the list opened from Upcoming asks the server for upcoming pods only', () => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
    cy.visitPortal('pods', '/');
    cy.interceptOperation('PodsTable');
    cy.byTestId('directory-tile-upcoming').click();
    cy.wait('@PodsTable').its('request.body.variables.lifecycle').should('eq', 'UPCOMING');
  });

  it('PAB-03 an unknown path inside the portal goes back to the brief', () => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
    cy.visitPortal('pods', '/nowhere');
    cy.location('pathname').should('eq', '/');
    cy.byTestId('directory-tile-total').should('be.visible');
  });

  it('PAB-04 without ALL_PODS_ACCESS the sign-in is refused, and the server refuses the dashboard to another portal’s token', () => {
    revokeRoles(account, ['ALL_PODS_ACCESS']);
    expectUiLoginRefused('pods', account);
    apiLoginRaw('pods', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    apiLoginRaw('support', account).then((body) => {
      const token = body.data?.login?.token ?? null;
      expect(token, 'the Support sign-in still works').to.be.a('string');
      gqlRaw('pods', POD_DASHBOARD, {}, token).then((page) => expectRefused(page, 'podDashboard', ACCESS_DENIED));
    });
    expectDeniedBanner('pods', 'Duncit Pods');
    grantStaffRoles(account);
  });
});
