import type { RunAccount } from '../../support/run-account';
import {
  apiToken,
  navLeaf,
  openSignedIn,
  readWorkspace,
  restoreWorkspace,
  runPasswordNow,
  visibleTestId,
  type WorkspaceDto,
} from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Shell navigation: what the sidebar holds, the icon rail it
 * minimises to — saved server-side (`sidebar_collapsed`, saveShellWorkspaceState)
 * so it follows the person into another console — and the temporary drawer it
 * becomes below the md breakpoint. The workspace is put back in `after()`.
 */

describe('Portal Shell · Shell navigation (Support and Legal, run account)', () => {
  let account: RunAccount;
  let saved: WorkspaceDto | null = null;

  before(() => {
    account = staffAccount();
    apiToken('support', account).then((token) =>
      readWorkspace('support', token).then((state) => {
        saved = state;
        // Start from the full sidebar.
        if (state.sidebar_collapsed) restoreWorkspace('support', token, { ...state, sidebar_collapsed: false });
      }),
    );
  });

  after(() => {
    if (!account || !saved) return;
    const state = saved;
    apiToken('support', account).then((token) => restoreWorkspace('support', token, state));
  });

  it('SHN-01 the sidebar shows the console name, its leaves and groups, the signed-in user and the caption', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/');
    visibleTestId('shell-sidebar').within(() => {
      cy.contains('Support').should('be.visible');
      for (const leaf of ['Dashboard', 'SOS Alerts', 'Callback Requests', 'Tickets', 'Chat with Us', 'Mail Automation']) {
        cy.contains('[data-testid="shell-nav-leaf"]', leaf).should('be.visible');
      }
      cy.contains('[data-testid="shell-nav-group"]', 'FAQs').should('be.visible');
      cy.contains('[data-testid="shell-nav-group"]', 'Reported Problems').should('be.visible');
      cy.byTestId('shell-sidebar-user-avatar').should('be.visible');
      cy.contains('© Duncit').should('be.visible');
    });
  });

  it('SHN-02 Minimise turns the sidebar into an icon rail and saves it', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/');
    cy.interceptOperation('SaveShellWorkspaceState');
    visibleTestId('shell-sidebar-collapse-toggle').should('have.attr', 'aria-expanded', 'true').click();
    cy.wait('@SaveShellWorkspaceState').its('request.body.variables.input').should('deep.equal', { sidebar_collapsed: true });
    visibleTestId('shell-sidebar-collapse-toggle').should('have.attr', 'aria-expanded', 'false');
    cy.get('[data-testid="shell-nav-rail-leaf"]:visible').should('have.length.at.least', 1);
    cy.get('[data-testid="shell-nav-leaf"]:visible').should('not.exist');
  });

  it('SHN-03 Legal opens on the rail already, and expanding it there saves the full sidebar again', () => {
    cy.apiPortalLogin('legal', account.email, runPasswordNow(account));
    cy.interceptOperation('ShellWorkspaceState');
    openSignedIn('legal', '/');
    cy.wait('@ShellWorkspaceState').its('response.body.data.shellWorkspaceState.sidebar_collapsed').should('eq', true);
    visibleTestId('shell-sidebar-collapse-toggle').should('have.attr', 'aria-expanded', 'false');
    cy.interceptOperation('SaveShellWorkspaceState');
    visibleTestId('shell-sidebar-collapse-toggle').click();
    cy.wait('@SaveShellWorkspaceState').its('request.body.variables.input').should('deep.equal', { sidebar_collapsed: false });
    cy.get('[data-testid="shell-nav-leaf"]:visible').should('have.length.at.least', 1);
  });

  it('SHN-04 below md the sidebar is a temporary drawer that closes once a page is picked', () => {
    cy.viewport(390, 844);
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/');
    cy.get('[data-testid="shell-sidebar"]:visible').should('not.exist');
    cy.byTestId('shell-header-open-nav').should('be.visible').click();
    visibleTestId('shell-sidebar').should('have.length', 1);
    navLeaf('Tickets').click();
    cy.location('pathname').should('eq', '/tickets');
    cy.get('[data-testid="shell-sidebar"]:visible').should('not.exist');
  });
});
