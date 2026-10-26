/// <reference types="cypress" />
import { NO_SUCH_ID, asEcommManager, visitAndWait } from '../../support/ui-partners-3';

/**
 * Brand products, live (scenario map › Partners › Brand products: "View a
 * product that does not exist", "Settings for an unknown product") — the
 * Partner Brand studio's listings, not the e-commerce pet store.
 *
 * The product view and settings pages (src/pages/list-products-page) find the
 * listing among the brand's own (`myProductListings`). An id no listing
 * carries reads "Product listing was not found." with no Edit button and no
 * settings form. The run account is granted ECOMM_MANAGER for this spec only
 * and owns no brand or listing. Read-only.
 */

const productPath = (suffix: string) => `/ecomm-brand/${NO_SUCH_ID}/products/${NO_SUCH_ID}/${suffix}`;

describe('Partners · Brand products (ECOMM_MANAGER, unknown listing)', () => {
  asEcommManager();

  it('BP-01 viewing a listing that does not exist warns, with no Edit button', () => {
    visitAndWait(productPath('view'), 'MyProductListings');
    cy.byTestId('product-detail-not-found').should('have.text', 'Product listing was not found.');
    cy.byTestId('product-detail-edit').should('not.exist');
  });

  it('BP-02 the settings of a listing that does not exist warn, with no settings form', () => {
    visitAndWait(productPath('settings'), 'MyProductListings');
    cy.byTestId('product-settings-not-found').should('have.text', 'Product listing was not found.');
    cy.byTestId('product-settings-form').should('not.exist');
  });
});
