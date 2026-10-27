/// <reference types="cypress" />
import { NO_SUCH_ID, asEcommManager, visitAndWait } from '../../support/ui-partners-3';

/**
 * Brand warehouses, live (scenario map › Partners › Brand warehouses:
 * "Settings for a brand not in the account") — the Partner Brand studio, not
 * the e-commerce pet store.
 *
 * /ecomm-brand/:brandId/settings (src/pages/ecomm-brand-page/brand-settings)
 * finds the brand among the partner's own (`myEcommBrands`); a brand that is
 * not theirs reads "Brand was not found in your account." and shows no pickup
 * address card or Add button. An id no record carries stands for "not in the
 * account", so no other partner's brand is opened. The run account is granted
 * ECOMM_MANAGER for this spec only. Read-only.
 */

describe('Partners · Brand warehouses (ECOMM_MANAGER)', () => {
  asEcommManager();

  it('BW-01 the settings of a brand not in the account say so and offer no pickup addresses', () => {
    visitAndWait(`/ecomm-brand/${NO_SUCH_ID}/settings`, 'MyEcommBrands');
    cy.byTestId('brand-settings-not-found').should('have.text', 'Brand was not found in your account.');
    cy.byTestId('warehouse-sync').should('not.exist');
    cy.get('[data-testid^="pickup-card-"]').should('not.exist');
  });
});
