import type { RunAccount } from '../../support/run-account';
import { searchTable } from '../../support/tables';
import { countOperation, expectNotSent, expectTableEmpty, specMarker, wideViewport, type OperationCount } from '../../support/ui-staff';
import { firstRow, onboardingAccount, productsVisible, releaseOnboarding, signInOnboarding } from '../../support/ui-onboarding';

/**
 * Onboarding · Brand review: Onboarded E-Commerce Brands (/ecomm-brands) —
 * the Partner Brand onboarding queue (partners-app /ecomm-brand applicants),
 * never the ecomm.duncit.com pet store.
 *
 * The page exists only while `is_product_visible` is on (App.tsx RequireEcomm);
 * with it off the spec proves the route goes home without asking for brands.
 * Brands are real partners': no Approve / Reject, no commission save.
 */

const TABLE = 'onboarding-ecomm-brands';
const BRANDS = 'EcommBrandsTable';
const REVIEW_WRITES = ['ApproveEcommBrand', 'RejectEcommBrand', 'SetBrandCommission'];

interface BrandRow {
  id: string;
  brand_name: string | null;
}

describe('Onboarding · Brand review (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';
  let ecommOn = false;

  before(() => {
    account = onboardingAccount();
    marker = specMarker(account, 'onboarding-brands');
    productsVisible().then((on) => {
      ecommOn = on;
    });
  });

  after(() => {
    releaseOnboarding(account);
  });

  beforeEach(() => {
    signInOnboarding(account);
  });

  it('OBR-01 the brand table loads with its Review action while e-commerce is on (and is unreachable while it is off); an unmatched search reads "No brands found."', () => {
    const reads = countOperation(BRANDS);
    wideViewport();
    cy.interceptOperation(BRANDS);
    cy.visitPortal('onboarding', '/ecomm-brands');
    if (!ecommOn) {
      cy.location('pathname').should('eq', '/');
      cy.byTestId('onboarding-dashboard-title').should('be.visible');
      expectNotSent(reads, BRANDS);
      return;
    }
    firstRow<BrandRow>(BRANDS, 'ecommBrandsTable', 'onboarded e-commerce brand').then((brand) => {
      cy.byTestId(`${TABLE}-row-${brand.id}`).within(() => cy.byTestId(`brand-review-${brand.id}`).should('be.visible'));
    });
    searchTable(BRANDS, `${marker} no such brand`);
    expectTableEmpty('No brands found.');
  });

  it('OBR-02 Review brand names the brand, keeps Reject disabled until notes are typed, and Close sends nothing', () => {
    if (!ecommOn) {
      // The off side is OBR-01's; there is no brand dialog to open.
      cy.visitPortal('onboarding', '/ecomm-brands');
      cy.location('pathname').should('eq', '/');
      return;
    }
    const writes: OperationCount[] = REVIEW_WRITES.map((name) => countOperation(name));
    wideViewport();
    cy.interceptOperation(BRANDS);
    cy.visitPortal('onboarding', '/ecomm-brands');
    firstRow<BrandRow>(BRANDS, 'ecommBrandsTable', 'onboarded e-commerce brand').then((brand) => {
      cy.byTestId(`${TABLE}-row-${brand.id}`).within(() => cy.byTestId(`brand-review-${brand.id}`).click());
      cy.byTestId('brand-review-dialog').should('contain.text', 'Review brand');
      cy.byTestId('brand-review-name').should('have.text', brand.brand_name || 'Brand');
      cy.byTestId('brand-review-reject').should('be.disabled');
      cy.byTestId('brand-review-notes').find('textarea').first().type('GST certificate checked', { delay: 0 });
      cy.byTestId('brand-review-reject').should('be.enabled');
      cy.byTestId('brand-review-close').click();
      cy.byTestId('brand-review-dialog').should('not.exist');
    });
    REVIEW_WRITES.forEach((name, i) => expectNotSent(writes[i], name));
  });
});
