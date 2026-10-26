import {
  countOperation,
  expectNotSent,
  grantRunRoles,
  partnerWorld2,
  publicFlag,
  revokeRunRoles,
  signInRunPartner,
} from '../../support/ui-partners-2';

/**
 * Partners › E-commerce access: the E-Commerce BRAND area of the Partners
 * console (/ecomm, /ecomm-brand) — never the ecomm.duncit.com pet store.
 *
 * SectionGate (src/components/SectionGate.tsx) renders nothing until the user
 * and the `is_product_visible` flag have loaded, then sends anyone without
 * ECOMM_MANAGER — or anyone at all while the flag is off — back to `/`, which
 * lands the run partner on the Club Admin Options page (its first section).
 * `/list-products` is a bare `<Navigate to="/ecomm-brand" />` (App.tsx), so it
 * meets the same gate. ECOMM_MANAGER is one of the roles the run account can
 * be granted (E2eStaffRole); it is revoked in `after()`.
 */

const LANDING = '/club-admin/options';

describe('Partners UI · E-commerce Brand access', () => {
  let productsOn = false;

  before(() => {
    signInRunPartner();
    // Fails loudly when the fixture step did not make the account a partner.
    partnerWorld2();
    publicFlag('is_product_visible').then((on) => {
      productsOn = on;
    });
  });

  describe('without ECOMM_MANAGER', () => {
    before(() => {
      signInRunPartner();
      cy.gql<{ me: { roles: string[] } }>('query E2eUiP2EcommRoles { me { roles } }').then(({ me }) => {
        expect(me.roles, 'the run partner holds no ECOMM_MANAGER yet').to.not.include('ECOMM_MANAGER');
      });
    });

    beforeEach(() => {
      signInRunPartner();
    });

    it('EA-01 a typed /ecomm/dashboard is sent back to / and on to the landing page, without loading the brand figures', () => {
      const stats = countOperation('PartnerEcommStats');
      cy.visitApp('/ecomm/dashboard');
      cy.location('pathname').should('eq', LANDING);
      cy.byTestId('studio-options-CLUB').should('be.visible');
      cy.byTestId('ecomm-dashboard-brands').should('not.exist');
      expectNotSent(stats, 'PartnerEcommStats');
    });

    it('EA-02 the legacy /list-products link forwards to /ecomm-brand, whose gate then sends a non-manager home', () => {
      const brands = countOperation('MyEcommBrandsTable');
      cy.visitApp('/list-products');
      cy.location('pathname').should('eq', LANDING);
      cy.byTestId('ecomm-brand-page').should('not.exist');
      expectNotSent(brands, 'MyEcommBrandsTable');
    });
  });

  describe('with ECOMM_MANAGER granted', () => {
    before(() => {
      grantRunRoles(['ECOMM_MANAGER']);
    });

    beforeEach(() => {
      signInRunPartner();
    });

    after(() => {
      revokeRunRoles(['ECOMM_MANAGER']);
    });

    it('EA-03 /list-products lands on /ecomm-brand and the E-Commerce Brands page renders (is_product_visible on)', function () {
      if (!productsOn) this.skip();
      cy.visitApp('/list-products');
      cy.location('pathname').should('eq', '/ecomm-brand');
      cy.byTestId('ecomm-brand-page').should('be.visible').and('contain.text', 'E-Commerce Brands');
    });

    it('EA-04 a bookmarked /ecomm/dashboard waits for the role and the flag, then renders without a redirect', function () {
      if (!productsOn) this.skip();
      cy.interceptOperation('PartnerEcommStats');
      cy.visitApp('/ecomm/dashboard');
      cy.wait('@PartnerEcommStats');
      cy.byTestId('ecomm-dashboard-brands').should('be.visible').and('contain.text', 'Your Brands');
      cy.location('pathname').should('eq', '/ecomm/dashboard');
    });

    it('EA-05 with is_product_visible off the area is gone even for a manager: /ecomm/dashboard goes home', function () {
      if (productsOn) this.skip();
      const stats = countOperation('PartnerEcommStats');
      cy.visitApp('/ecomm/dashboard');
      cy.location('pathname').should('eq', LANDING);
      expectNotSent(stats, 'PartnerEcommStats');
    });
  });
});
