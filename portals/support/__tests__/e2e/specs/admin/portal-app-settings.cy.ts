import { ACCESS_DENIED } from '../../support/ui-staff';
import { adminRaw, cityAdminSeat, expectError, releaseAdminRoles, type AdminSeat } from '../../support/ui-admin-2';

/**
 * Admin › System › Portal App Setting (/portal-app-settings). The page sits in
 * every admin's sidebar, but its table and its switches are TECH_MANAGE only
 * (portalMode.resolver.ts: SUPER_ADMIN, TECH_MANAGER) — roles a run account is
 * never given. What a City Admin gets is proven: the table's read is refused
 * on screen, and so is a switch write (sent for a portal key that does not
 * exist, so even a wrong gate could change nothing). Reviewing the rows and
 * toggling chat / the Apps drawer need TECH_MANAGER and are not run.
 */

const SET_FEATURES = `mutation E2eSetPortalAppFeatures($key: String!, $chat_enabled: Boolean) {
  setPortalAppFeatures(key: $key, chat_enabled: $chat_enabled) { key }
}`;

describe('Admin · Portal App Settings (City Admin, run account)', () => {
  let seat: AdminSeat;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
    });
  });

  after(() => {
    releaseAdminRoles(seat?.account);
  });

  it('PAS-01 a City Admin opens the page and is shown the refusal instead of the portal rows', () => {
    cy.interceptOperation('PortalAppSettingsTable');
    cy.visitPortal('admin', '/portal-app-settings');
    cy.wait('@PortalAppSettingsTable').its('response.body.errors.0.message').should('eq', ACCESS_DENIED);
    cy.byTestId('duncit-table-error').should('contain.text', ACCESS_DENIED);
    cy.byTestId('admin-portal-app-settings-row-admin').should('not.exist');
  });

  it('PAS-02 the chat / Apps switch write is refused to a City Admin', () => {
    adminRaw(SET_FEATURES, { key: `e2e-${seat.account.stamp}-none`, chat_enabled: false }).then((body) =>
      expectError(body, ACCESS_DENIED),
    );
  });
});
