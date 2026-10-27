/// <reference types="cypress" />
import { studioOptionsFor } from '@duncit/utils';
import { revokeRunRoles, signInRunAs } from '../../../support/access-steps';
import { declineTracking, publicFlag, requireProductsOn, visitAndWait } from '../../../support/ui-apps-3';

/**
 * Product Studio, live (scenario map › Product Studio).
 *
 * The run account is granted ECOMM_MANAGER for this spec (revoked in after()).
 * /products/manage ("ecomm Studio") sums `availablePodProducts`: the number of
 * products, the units in stock and the rounded average price
 * (products-manage-page/index.tsx); /products/options lists the ECOMM studio's
 * options from the shared catalogue (`studioOptionsFor`), with no role switcher
 * for an account holding a single partner role. The figures are computed from
 * the same query the page runs.
 */

const ROLES = ['ECOMM_MANAGER'] as const;

interface DashboardProduct {
  id: string;
  unit_cost: number | null;
  available_count: number | null;
}

const DASHBOARD = `query E2eUi3EcommDashboard { availablePodProducts { id unit_cost available_count } }`;

describe('Product Studio', () => {
  before(() => {
    signInRunAs(ROLES);
    requireProductsOn();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  beforeEach(() => {
    declineTracking();
  });

  it('PS-01 ecomm Studio shows the catalogue size, the units in stock and the average price', () => {
    cy.gql<{ availablePodProducts: DashboardProduct[] }>(DASHBOARD).then(({ availablePodProducts: rows }) => {
      const stock = rows.reduce((sum, row) => sum + (row.available_count ?? 0), 0);
      const average = rows.length
        ? Math.round(rows.reduce((sum, row) => sum + (row.unit_cost ?? 0), 0) / rows.length)
        : 0;
      visitAndWait('/products/manage', 'EcommDashboardProducts');
      cy.byTestId('products-manage-page').should('be.visible');
      cy.byTestId('studio-page-header-title').should('have.text', 'ecomm Studio');
      cy.byTestId('products-manage-page-stat-Products').should('contain.text', String(rows.length));
      cy.byTestId('products-manage-page-stat-In stock').should('contain.text', String(stock));
      cy.byTestId('products-manage-page-stat-Avg price').should('contain.text', `₹${average}`);
      cy.byTestId('products-manage-page-stock-title').should('have.text', 'Stock by product');
      cy.byTestId('products-manage-page-stock-empty').should(rows.length === 0 ? 'exist' : 'not.exist');
    });
  });

  it('PS-02 ecomm Options lists the studio’s options, with no role switcher for one role', () => {
    publicFlag('auto_pods').then((autoPods) => {
      const options = studioOptionsFor('ECOMM', ['USER', ...ROLES], { autoPods });
      expect(options, 'the ECOMM studio has options for an ECOMM_MANAGER').not.to.be.empty;
      cy.visitApp('/products/options');
      cy.location('pathname').should('eq', '/products/options');
      cy.byTestId('studio-options-ecomm').should('be.visible');
      cy.byTestId('studio-role-switcher').should('not.exist');
      options.forEach((option) => cy.byTestId(`studio-option-${option.key}`).should('exist'));
    });
  });
});
