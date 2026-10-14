/// <reference types="cypress" />
import { formatINR } from '@duncit/utils';
import { asEcommManager, visitAndWait } from '../../support/ui-partners-3';

/**
 * Brand dashboard, live (scenario map › Partners › Brand dashboard) — the
 * Partner Brand studio (partners-app /ecomm), not the e-commerce pet store.
 *
 * /ecomm/dashboard (src/pages/ecomm-dashboard-page) draws seven KPI cards and
 * the products chart from `partnerEcommStats`. The run account is granted
 * ECOMM_MANAGER for this spec only and owns no brand, so every figure is the
 * server's zero and the chart says nothing has sold — the populated half of
 * the rows needs a brand with paid orders and is not run here.
 */

const STATS = `query E2eUiP3EcommStats {
  partnerEcommStats {
    total_brands approved_brands total_products approved_products total_warehouses
    total_orders total_items_sold gross_revenue net_earnings
    product_performance { product_id }
  }
}`;

interface Stats {
  total_brands: number;
  approved_brands: number;
  total_products: number;
  approved_products: number;
  total_warehouses: number;
  total_orders: number;
  total_items_sold: number;
  gross_revenue: number;
  net_earnings: number;
  product_performance: Array<{ product_id: string }>;
}

describe('Partners · Brand dashboard (ECOMM_MANAGER, no brand)', () => {
  asEcommManager();

  it('BD-01 the seven KPI cards show the server’s figures, money in INR, and the chart says nothing has sold', () => {
    cy.gql<{ partnerEcommStats: Stats }>(STATS).then(({ partnerEcommStats: stats }) => {
      if (stats.total_brands !== 0 || stats.product_performance.length !== 0) {
        throw new Error('The run account already has a brand or product sales; this scenario reads a brand-less partner.');
      }
      visitAndWait('/ecomm/dashboard', 'PartnerEcommStats');
      const cards: Array<[string, string, string?]> = [
        ['brands', 'Total Brands', `${stats.approved_brands} approved`],
        ['products', 'Total Products', `${stats.approved_products} approved`],
        ['warehouses', 'Total Pickup Addresses'],
        ['orders', 'Total Orders'],
        ['items', 'Total Items Sold'],
        ['revenue', 'Total Revenue'],
        ['earnings', 'Total Earnings'],
      ];
      const values: Record<string, string> = {
        brands: String(stats.total_brands),
        products: String(stats.total_products),
        warehouses: String(stats.total_warehouses),
        orders: String(stats.total_orders),
        items: String(stats.total_items_sold),
        revenue: formatINR(stats.gross_revenue),
        earnings: formatINR(stats.net_earnings),
      };
      cy.get('[data-testid^="ecomm-stat-"]').should('have.length', cards.length);
      cards.forEach(([key, label, caption]) => {
        cy.byTestId(`ecomm-stat-${key}`).should('contain.text', label).and('contain.text', values[key]);
        if (caption) cy.byTestId(`ecomm-stat-${key}`).should('contain.text', caption);
      });
      cy.byTestId('ecomm-products-empty').should('have.text', 'No product sales yet. Once a product sells it appears here.');
    });
  });

  it('BD-02 the hero’s Your Brands button opens the E-Commerce Brands page', () => {
    visitAndWait('/ecomm/dashboard', 'PartnerEcommStats');
    cy.byTestId('ecomm-dashboard-brands').should('have.text', 'Your Brands').click();
    cy.location('pathname').should('eq', '/ecomm-brand');
    cy.byTestId('ecomm-brand-page').should('be.visible').and('contain.text', 'E-Commerce Brands');
  });
});
