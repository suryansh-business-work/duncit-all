import { submitPassword } from '../../support/login-page';
import { runAccount } from '../../support/run-account';
import {
  copyOf,
  featureFlag,
  findPartnerWorld,
  foreignVenueId,
  loadCopy,
  navLeaf,
  rememberStudio,
  signInPartner,
  type PartnerWorld,
} from '../../support/partner-world-1';

/**
 * Partners · Access & navigation, as the run's partner (VENUE_OWNER, HOST and
 * CLUB_ADMIN after the mWeb fixture step).
 *
 * The console shows ONE studio at a time (config/app-config.ts buildNav): `/`
 * opens the Options page of the studio the partner was last in, else of the
 * first one they hold in PARTNER_SECTIONS order — Club Admin, Venue Owner,
 * Host (config/partner-sections.ts). The Venue Studio alone lists its options
 * in the sidebar (nestedNav). SectionGate keeps each studio's routes to its
 * role and waits for the user before deciding.
 *
 * The rows that need an account WITHOUT one of these roles are not here: the
 * partner roles come from approvals and cannot be revoked by the e2e role API.
 */

const AUTO_PODS_FLAG = 'auto_pods';

/** Every sidebar leaf's route, top to bottom. */
function sidebarRoutes(): Cypress.Chainable<string[]> {
  return cy
    .get('[data-testid="shell-nav-leaf"]')
    .then(($leaves) => [...$leaves].map((leaf) => leaf.getAttribute('href') ?? ''));
}

describe('Partners UI · Access & navigation', () => {
  let world: PartnerWorld;
  let autoPods = false;

  before(() => {
    signInPartner();
    loadCopy();
    findPartnerWorld().then((found) => {
      world = found;
    });
    featureFlag(AUTO_PODS_FLAG).then((on) => {
      autoPods = on;
    });
  });

  beforeEach(() => {
    signInPartner();
  });

  it('AN-01 / with no studio remembered opens the Club Studio options — the first studio the account holds', () => {
    expect(world.roles, 'partner roles').to.include.members(['CLUB_ADMIN', 'VENUE_OWNER', 'HOST']);
    cy.visitApp('/');
    cy.location('pathname').should('eq', '/club-admin/options');
    cy.byTestId('studio-options-CLUB').should('be.visible');
    cy.byTestId('studio-switcher').should('be.visible');
  });

  it('AN-02 / reopens the remembered Venue Studio, whose Dashboard option shows Partner tools · Venues › Venue Dashboard', () => {
    rememberStudio('VENUE_OWNER');
    cy.visitApp('/');
    cy.location('pathname').should('eq', '/venues/options');
    cy.byTestId('studio-options-VENUE').should('be.visible');
    cy.byTestId('studio-option-item-dashboard').should('have.attr', 'href', '/venues/dashboard').click();
    cy.location('pathname').should('eq', '/venues/dashboard');
    cy.byTestId('venue-dashboard-title')
      .should('have.text', copyOf('partners.venueDashboardPage.venueDashboard', 'Venue Dashboard'))
      .parent()
      .should('contain.text', copyOf('partners.common.partnerToolsVenues', 'Partner tools · Venues'));
  });

  it('AN-03 the Venue Studio sidebar lists its options, and its Settings entry opens Venue settings', () => {
    cy.interceptOperation('MyVenuesSettings');
    cy.visitApp('/venues/dashboard');
    navLeaf('/venues/options').should('be.visible');
    navLeaf('/register-venue').should('be.visible');
    navLeaf('/venues/requests').should('be.visible');
    navLeaf('/venues/settings').should('be.visible').click();
    cy.location('pathname').should('eq', '/venues/settings');
    cy.wait('@MyVenuesSettings');
    cy.byTestId('venues-hub-tab-/venues/settings').should('have.attr', 'aria-selected', 'true');
    cy.byTestId('venue-settings-title').should('have.text', copyOf('venueSettings.title', 'Venue settings'));
  });

  it('AN-04 Auto Pods entries follow the auto_pods flag, and / never lands on an Auto Pods page', () => {
    cy.visitApp('/venues/dashboard');
    navLeaf('/venues/dashboard').should('be.visible');
    sidebarRoutes().then((routes) => {
      if (autoPods) {
        // Catalogue order (@duncit/utils STUDIO_OPTION_LIST): it follows Slot Requests.
        expect(routes.indexOf('/venues/auto-pods'), 'Auto Pods after Slot Requests').to.equal(
          routes.indexOf('/venues/requests') + 1,
        );
      } else {
        expect(routes, 'sidebar routes with the flag off').not.to.include('/venues/auto-pods');
      }
    });
    cy.visitApp('/host/options');
    cy.byTestId('studio-options-HOST').should('be.visible');
    cy.byTestId('studio-option-item-auto-pods').should(autoPods ? 'exist' : 'not.exist');
    cy.visitApp('/club-admin/options');
    cy.byTestId('studio-options-CLUB').should('be.visible');
    cy.byTestId('studio-option-item-auto-pods').should(autoPods ? 'exist' : 'not.exist');
    cy.visitApp('/');
    cy.location('pathname').should('eq', '/club-admin/options');
  });

  it('AN-05 a typed-in /venues/pods waits for the user and renders in place instead of bouncing to /', () => {
    cy.interceptOperation('VenuePods');
    cy.visitApp('/venues/pods');
    cy.wait('@VenuePods');
    cy.byTestId('venue-pods-hub').should('be.visible');
    cy.location('pathname').should('eq', '/venues/pods');
  });

  it('AN-06 the server refuses venue pods of a venue the account does not own', () => {
    foreignVenueId(world).then((venueId) => {
      cy.gqlError(`query E2eUiForeignVenuePods($venue: ID) { venuePods(venue_id: $venue) { id } }`, {
        venue: venueId,
      }).should('eq', 'You do not own this venue');
    });
  });

  it('AN-07 signed out, /host/dashboard bounces to /login and the sign-in returns to the Host Dashboard', () => {
    const account = runAccount();
    cy.clearAuth();
    cy.visitApp('/host/dashboard');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent('/host/dashboard')}`);
    cy.byTestId('login-screen').should('be.visible');
    submitPassword(account.email, account.password('CHANGED'));
    cy.location('pathname').should('eq', '/host/dashboard');
    cy.byTestId('host-dashboard-hero').should('be.visible').and('contain.text', 'Host Dashboard');
  });

  it('AN-08 the studio switcher lists the three studios; Host Studio options end with Verification then Withdrawal', () => {
    cy.visitApp('/club-admin/options');
    cy.byTestId('studio-switcher').click();
    cy.byTestId('studio-option-CLUB_ADMIN').should('be.visible');
    cy.byTestId('studio-option-VENUE_OWNER').should('be.visible');
    cy.byTestId('studio-option-HOST').should('be.visible').click();
    cy.location('pathname').should('eq', '/host/options');
    navLeaf('/host/options').should('be.visible');
    cy.get('[data-testid^="studio-option-item-"]').then(($items) => {
      const keys = [...$items].map((item) => item.dataset.testid?.replace('studio-option-item-', ''));
      expect(keys.slice(-2), 'the last two Host options').to.deep.equal(['verification', 'withdrawal']);
    });
    cy.byTestId('studio-option-item-withdrawal').should('have.attr', 'href', '/wallet');
  });

  it('AN-09 legacy paths redirect: /club-admin, /host and /pods open their pages; an unknown path lands on /', () => {
    cy.visitApp('/no-such-partner-page');
    cy.location('pathname').should('eq', '/club-admin/options');
    cy.visitApp('/club-admin');
    cy.location('pathname').should('eq', '/club-admin/dashboard');
    cy.visitApp('/host');
    cy.location('pathname').should('eq', '/host/dashboard');
    cy.byTestId('host-dashboard-hero').should('be.visible');
    cy.visitApp('/pods');
    cy.location('pathname').should('eq', '/host/pods');
    cy.byTestId('host-pods-hub').should('be.visible');
  });
});
