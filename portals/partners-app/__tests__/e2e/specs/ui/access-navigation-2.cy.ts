import { partnerWorld2, publicFlag, signInRunPartner, tableRow, type PartnerWorld2 } from '../../support/ui-partners-2';

/**
 * Partners › Access & navigation, as the partner the fixture step made: the run
 * account holds CLUB_ADMIN, VENUE_OWNER and HOST (no ECOMM_MANAGER).
 *
 * `/` is PartnerLanding → landingPath (src/config/app-config.ts): the Options
 * page of the studio the partner was last in (useActiveStudio, localStorage
 * `partners_active_studio`), else the FIRST held section in PARTNER_SECTIONS
 * order — Club Admin, Venue Owner, Host, E-Commerce Brand. Cypress starts each
 * test with empty storage, so nothing is remembered and Club Admin wins.
 * Unmatched paths are `<Navigate to="/" />` (App.tsx), and `/pods` is the
 * legacy redirect to `/host/pods`.
 */

const CLUB_OPTIONS = '/club-admin/options';
/** STUDIO_OPTION_LIST.CLUB (@duncit/utils studio-options): dashboard, clubs, then Auto Pods behind its flag. */
const AUTO_PODS_OPTION = 'studio-option-item-auto-pods';

describe('Partners UI · Access & navigation (run partner: Club Admin, Venue Owner, Host)', () => {
  let autoPodsOn = false;
  let world: PartnerWorld2;

  before(() => {
    signInRunPartner();
    partnerWorld2().then((found) => {
      world = found;
    });
    publicFlag('auto_pods').then((on) => {
      autoPodsOn = on;
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('AN2-01 / lands a multi-role partner on the Club Admin Options page, the first section it holds', () => {
    cy.visitApp('/');
    cy.location('pathname').should('eq', CLUB_OPTIONS);
    cy.byTestId('studio-options-CLUB').should('be.visible');
    cy.byTestId('studio-option-item-dashboard').should('have.attr', 'href', '/club-admin/dashboard');
    cy.byTestId('studio-option-item-clubs').should('have.attr', 'href', '/club-admin/clubs');
  });

  it('AN2-02 / reopens the studio the partner was last in: after the Host dashboard it lands on Host Options', () => {
    cy.visitApp('/host/dashboard');
    cy.location('pathname').should('eq', '/host/dashboard');
    cy.window().its('localStorage').invoke('getItem', 'partners_active_studio').should('eq', 'HOST');
    cy.visitApp('/');
    cy.location('pathname').should('eq', '/host/options');
    cy.byTestId('studio-options-HOST').should('be.visible');
  });

  it('AN2-03 an unknown route goes back to / and on to the landing page', () => {
    cy.visitApp('/no-such-partner-page/e2e');
    cy.location('pathname').should('eq', CLUB_OPTIONS);
    cy.byTestId('studio-options-CLUB').should('be.visible');
  });

  it('AN2-04 the legacy /pods link becomes /host/pods, and the Host gate lets the run host see Your Pods', () => {
    cy.interceptOperation('PartnerMyHostPodsTable');
    cy.visitApp('/pods');
    cy.location('pathname').should('eq', '/host/pods');
    cy.wait('@PartnerMyHostPodsTable');
    cy.byTestId('host-pods-hub').should('be.visible');
    tableRow('partners-app-host-pods', world.freePod.id, [world.freePod.title]);
  });

  it('AN2-05 the Club Options page lists Auto Pods right after the dashboard and clubs only while auto_pods is on', () => {
    cy.visitApp(CLUB_OPTIONS);
    cy.byTestId('studio-options-CLUB').find('[data-testid^="studio-option-item-"]').should(($items) => {
      const keys = [...$items].map((item) => item.dataset.testid);
      expect(keys[0], 'the first option').to.equal('studio-option-item-dashboard');
      if (autoPodsOn) {
        expect(keys.indexOf(AUTO_PODS_OPTION), 'Auto Pods follows dashboard and clubs').to.equal(2);
      } else {
        expect(keys, 'no Auto Pods option while the flag is off').to.not.include(AUTO_PODS_OPTION);
      }
    });
  });
});
