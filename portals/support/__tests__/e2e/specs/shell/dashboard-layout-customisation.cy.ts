import type { RunAccount } from '../../support/run-account';
import { RESET_DASHBOARD_API, apiToken, asAccount, openSignedIn, runPasswordNow } from '../../support/ui-shell';
import { countOperation, expectNotSent, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Dashboard layout customisation (@duncit/dashboard), on the
 * Legal dashboard (`legal.overview`): Customise layout → the Arrange menu (the
 * keyboard alternative to dragging) → Save writes `SaveDashboardLayout` for
 * this person and this dashboard only, and the saved arrangement is what the
 * next load answers. Cancel discards unsaved moves without a write, and a save
 * that fails says so inline. The run account's saved arrangement is reset
 * before and after.
 */

const DASHBOARD = 'legal.overview';
const WIDGET = 'documents-tile';

interface LayoutItem {
  widget_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const byWidget = (items: readonly LayoutItem[]) =>
  [...items].sort((a, b) => a.widget_id.localeCompare(b.widget_id)).map(({ widget_id, x, y, w, h }) => ({ widget_id, x, y, w, h }));

/** Customise, then apply the first move the Arrange menu allows for the widget. */
function arrangeOnce(): void {
  cy.byTestId('dashboard-customise').click();
  cy.byTestId('dashboard-save').should('be.disabled');
  cy.byTestId(`dashboard-arrange-${WIDGET}`).click();
  cy.get('[role="menuitem"][data-testid^="dashboard-arrange-"]:not(.Mui-disabled)').first().click();
  cy.byTestId('dashboard-save').should('be.enabled');
}

describe('Portal Shell · Dashboard layout customisation (Legal, run account)', () => {
  let account: RunAccount;

  const reset = () =>
    apiToken('legal', account).then((token) => asAccount('legal', token, RESET_DASHBOARD_API, { dashboard_id: DASHBOARD }));

  before(() => {
    account = staffAccount();
    reset();
  });

  after(() => {
    if (account) reset();
  });

  beforeEach(() => {
    cy.apiPortalLogin('legal', account.email, runPasswordNow(account));
  });

  it('DLC-01 a rearranged dashboard is saved for this person and comes back on the next load', () => {
    openSignedIn('legal', '/');
    arrangeOnce();
    cy.interceptOperation('SaveDashboardLayout');
    cy.byTestId('dashboard-save').click();
    cy.wait('@SaveDashboardLayout').then(({ request, response }) => {
      expect(request.body.variables.dashboard_id).to.equal(DASHBOARD);
      expect(response?.body.errors).to.be.undefined;
      const saved = byWidget(request.body.variables.items as LayoutItem[]);
      expect(saved.map((item) => item.widget_id)).to.include(WIDGET);
      cy.byTestId('dashboard-customise').should('be.visible');
      cy.interceptOperation('MyDashboardLayout');
      cy.reload();
      cy.wait('@MyDashboardLayout').then(({ response: loaded }) => {
        const layout = (loaded?.body.data as { myDashboardLayout: { items: LayoutItem[] } | null }).myDashboardLayout;
        expect(layout, 'a saved layout').to.not.equal(null);
        expect(byWidget(layout?.items ?? [])).to.deep.equal(saved);
      });
    });
  });

  it('DLC-02 Cancel discards the unsaved move and writes nothing', () => {
    const save = countOperation('SaveDashboardLayout');
    cy.interceptOperation('MyDashboardLayout');
    openSignedIn('legal', '/');
    cy.wait('@MyDashboardLayout').then(({ response }) => {
      const before = (response?.body.data as { myDashboardLayout: { items: LayoutItem[] } | null }).myDashboardLayout;
      arrangeOnce();
      cy.byTestId('dashboard-cancel').click();
      cy.byTestId('dashboard-customise').should('be.visible');
      cy.byTestId('dashboard-save').should('not.exist');
      expectNotSent(save, 'SaveDashboardLayout');
      cy.interceptOperation('MyDashboardLayout', 'Reloaded');
      cy.reload();
      cy.wait('@Reloaded').its('response.body.data.myDashboardLayout').should((after) => {
        expect(after ? byWidget(after.items) : null).to.deep.equal(before ? byWidget(before.items) : null);
      });
    });
  });

  it('DLC-03 a save the server refuses is reported inline above the grid', () => {
    cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
      if ((req.body as { operationName?: string } | undefined)?.operationName === 'SaveDashboardLayout') {
        req.reply({ statusCode: 200, body: { errors: [{ message: 'E2E: save refused' }] } });
      }
    });
    openSignedIn('legal', '/');
    arrangeOnce();
    cy.byTestId('dashboard-save').click();
    cy.byTestId('app-shell-main').should('contain.text', 'Could not save your layout. Please try again.');
    cy.byTestId('dashboard-save').should('exist');
  });
});
