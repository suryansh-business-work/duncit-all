import { adminRun, releaseAdmin, signInAdmin, type AdminRun } from '../../support/ui-admin-1';

/**
 * Admin › Hub & Navigation: the module tiles on /hub, the sidebar and the
 * header search (portals/admin/src/pages/HubPage.tsx and the `nav` /
 * `searchItems` of app-config.ts, rendered by @duncit/shell).
 *
 * The Hub has five tiles — Dashboard, User Management, Catalog, Engagement and
 * System. Community went with Clubs to its own console, so no tile points at a
 * route admin no longer serves. Signed in as a City Admin.
 */

/** HubPage `hubCards` — each tile's key and the route it opens. */
const HUB_TILES: ReadonlyArray<{ key: string; to: string }> = [
  { key: 'dashboard', to: '/dashboard' },
  { key: 'users', to: '/users' },
  { key: 'catalog', to: '/categories' },
  { key: 'engagement', to: '/badges' },
  { key: 'system', to: '/branding' },
];

describe('Admin · Hub & Navigation (City Admin)', () => {
  let run: AdminRun;

  before(() => {
    adminRun(['CITY_ADMIN']).then((r) => {
      run = r;
    });
  });

  beforeEach(() => {
    signInAdmin(run);
  });

  after(() => releaseAdmin(run));

  it('HUB-01 the Hub shows exactly its five module tiles, and each one opens its own workspace', () => {
    cy.visitPortal('admin', '/hub');
    cy.byTestIdPrefix('admin-hub-tile-').should('have.length', HUB_TILES.length);
    for (const tile of HUB_TILES) {
      cy.visitPortal('admin', '/hub');
      cy.byTestId(`admin-hub-tile-${tile.key}`).click();
      cy.location('pathname').should('eq', tile.to);
    }
  });

  it('HUB-02 the sidebar opens the System group and its Portal App Setting page', () => {
    cy.visitPortal('admin', '/hub');
    cy.byTestId('shell-nav-group').contains('System').click();
    cy.byTestId('shell-nav-group').contains('System').closest('[data-testid="shell-nav-group"]').should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-testid="shell-nav-leaf"][href="/portal-app-settings"]').should('be.visible').click();
    cy.location('pathname').should('eq', '/portal-app-settings');
    cy.get('[data-testid="shell-nav-leaf"][href="/portal-app-settings"]').should('have.attr', 'aria-current', 'page');
  });

  it('HUB-03 the header search finds a page by one of its extra keywords ("logo" is Branding)', () => {
    cy.visitPortal('admin', '/hub');
    cy.byTestId('shell-header-search').type('logo');
    cy.byTestId('shell-header-search').type('{downArrow}{enter}');
    cy.location('pathname').should('eq', '/branding');
    cy.byTestId('shell-header-search').should('have.value', '');
  });
});
