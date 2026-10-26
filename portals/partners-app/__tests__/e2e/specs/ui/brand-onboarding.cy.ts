/// <reference types="cypress" />
import { asEcommManager, visitAndWait } from '../../support/ui-partners-3';

/**
 * Brand onboarding, live (scenario map › Partners › Brand onboarding) — the
 * Partner Brand studio's brand list (partners-app /ecomm-brand), never the
 * e-commerce pet store.
 *
 * /ecomm-brand (src/pages/ecomm-brand-page/EcommBrandPage.tsx) is the
 * server-paged table of the partner's own brands (`myEcommBrandsTable`) under
 * the E-Commerce Brands hero. The run account is granted ECOMM_MANAGER for
 * this spec only and owns no brand, so the table is empty. Read-only.
 */

const MY_BRANDS = `query E2eUiP3MyBrands { myEcommBrands { id } }`;

describe('Partners · Brand onboarding (ECOMM_MANAGER, no brand)', () => {
  asEcommManager();

  it('BO-01 the brands table is empty and invites a first brand', () => {
    cy.gql<{ myEcommBrands: Array<{ id: string }> }>(MY_BRANDS).then(({ myEcommBrands }) => {
      if (myEcommBrands.length > 0) throw new Error('The run account already owns a brand; this scenario reads a brand-less partner.');
    });
    visitAndWait('/ecomm-brand', 'MyEcommBrandsTable');
    cy.byTestId('ecomm-brand-page').should('contain.text', 'E-Commerce Brands').and('contain.text', 'Your brands');
    cy.byTestId('duncit-table-empty').should(
      'have.text',
      'No brands yet — create your first product brand to get started.',
    );
    cy.byTestId('brands-new-brand').should('be.visible').and('be.enabled');
  });
});
