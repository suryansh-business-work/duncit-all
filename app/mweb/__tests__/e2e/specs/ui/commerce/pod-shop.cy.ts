/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { openFromMenu } from '../../../support/menu-steps';
import { runAccount } from '../../../support/run-account';
import {
  clearCart,
  declineTracking,
  requireProductsOn,
  shopProducts,
  stockedProduct,
  visitAndWait,
  type ShopProduct,
  type StockedProduct,
} from '../../../support/ui-apps-3';

/**
 * Pod Shop, live (scenario map › Pod Shop).
 *
 * /shop lists `availablePodProducts` and filters, searches and sorts them on
 * the page (shop-page/useShopFilters.ts): products with no pod stock are hidden
 * until "Include out of stock" is ticked, search matches the product or brand
 * name, and the default sort is by name. Every expectation is computed from the
 * same query the page runs. The quick add (useQuickAddToCart) puts the product
 * in this browser's cart from the cheapest pod that stocks it — the cart lives
 * in localStorage, so nothing reaches the server and nothing is bought.
 */

const NAME_PREFIX = 'shop-product-name-';

const inStock = (products: readonly ShopProduct[]) => products.filter((product) => product.pod_available_count > 0);

/** `sortShopProducts`: a stable sort, so ties keep the server's order. */
const byName = (products: readonly ShopProduct[]) =>
  [...products].sort((a, b) => a.product_name.localeCompare(b.product_name)).map((product) => product.id);
const byPriceDesc = (products: readonly ShopProduct[]) =>
  [...products].sort((a, b) => b.unit_cost - a.unit_cost).map((product) => product.id);

/** Retried until the grid shows exactly these products, in this order. */
const expectGrid = (ids: readonly string[]) => {
  cy.byTestIdPrefix(NAME_PREFIX).should(($names) => {
    const shown = Cypress.$.makeArray($names).map((el) => String(el.dataset.testid).slice(NAME_PREFIX.length));
    expect(shown, 'products in the grid, in order').to.deep.equal([...ids]);
  });
};

const openShop = () => visitAndWait('/shop', 'ShopProducts');

describe('Pod Shop', () => {
  const account = runAccount();
  let products: ShopProduct[] = [];

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    requireProductsOn();
    shopProducts().then((rows) => {
      products = rows;
      if (inStock(rows).length === 0) throw new Error('Staging prerequisite: no product in the Pod Shop has pod stock.');
    });
  });

  beforeEach(() => {
    declineTracking();
  });

  it('SH-01 menu › Pod Shop lists every product with pod stock, by name, and hides the rest', () => {
    cy.interceptOperation('ShopProducts');
    openFromMenu('sidebar-item-Pod Shop', '/shop');
    cy.wait('@ShopProducts');
    cy.byTestId('shop-page-header-title').should('have.text', 'Pod Shop');
    cy.byTestId('shop-featured-heading-title').should('have.text', 'Featured Products');
    cy.byTestId('shop-search-input').should('have.attr', 'placeholder', 'Search products or brands…');
    expectGrid(byName(inStock(products)));
    products
      .filter((product) => product.pod_available_count <= 0)
      .forEach((product) => cy.byTestId(`shop-product-${product.id}`).should('not.exist'));
  });

  it('SH-02 a product card opens its product page', () => {
    const [product] = inStock(products);
    openShop();
    cy.byTestId(`shop-product-name-${product.id}`).click();
    cy.location('pathname').should('eq', `/product/${product.id}`);
    cy.byTestId('product-detail-name').should('have.text', product.product_name);
  });

  it('SH-03 search keeps the products whose name or brand matches, and says so when nothing does', () => {
    const [product] = inStock(products);
    const term = product.product_name.toLowerCase();
    const matches = inStock(products).filter(
      (row) => row.product_name.toLowerCase().includes(term) || (row.brand_name ?? '').toLowerCase().includes(term),
    );
    openShop();
    cy.byTestId('shop-search-input').type(product.product_name, { delay: 0 });
    expectGrid(byName(matches));
    cy.byTestId('shop-search-input').clear();
    cy.byTestId('shop-search-input').type(`${runMarker(account.stamp, 'mweb')} no such product`, { delay: 0 });
    cy.byTestId('shop-empty-title').should('have.text', 'No products match your filters.');
    cy.byTestIdPrefix(NAME_PREFIX).should('not.exist');
  });

  it('SH-04 the filter panel sorts by price, high to low, and counts the active filter', () => {
    openShop();
    cy.byTestId('shop-filter-toggle').should('have.attr', 'aria-expanded', 'false').click();
    cy.byTestId('shop-filter-toggle').should('have.attr', 'aria-expanded', 'true');
    cy.byTestId('shop-rating-0').should('have.attr', 'aria-pressed', 'true');
    cy.byTestId('shop-sort-select').click();
    cy.byTestId('shop-sort-PRICE_DESC').should('have.text', 'Price: high to low').click();
    cy.byTestId('shop-filter-count').should('have.text', '1');
    expectGrid(byPriceDesc(inStock(products)));
  });

  it('SH-05 "Include out of stock" shows the sold-out products with an "Out of stock" chip and no add button', () => {
    const soldOut = products.filter((product) => product.pod_available_count <= 0);
    if (soldOut.length === 0) {
      throw new Error('Staging prerequisite: no Pod Shop product is out of stock, so the out-of-stock rule has nothing to show.');
    }
    openShop();
    cy.byTestId('shop-filter-toggle').click();
    cy.byTestId('shop-oos-toggle').find('input').check();
    expectGrid(byName(products));
    soldOut.forEach((product) => {
      cy.byTestId(`shop-product-oos-${product.id}`).should('have.text', 'Out of stock');
      cy.byTestId(`shop-product-${product.id}-add`).should('not.exist');
    });
  });

  it('SH-06 the add button puts one unit in the cart, then two, under the cheapest pod that stocks it', () => {
    stockedProduct(2).then(({ product, pod }: StockedProduct) => {
      openShop();
      cy.interceptOperation('PodsForProduct');
      cy.byTestId(`shop-product-${product.id}-add`).click();
      cy.wait('@PodsForProduct');
      cy.byTestId(`shop-product-${product.id}-qty`).should('have.text', '1');
      cy.byTestId(`shop-product-${product.id}-inc`).click();
      cy.wait('@PodsForProduct');
      cy.byTestId(`shop-product-${product.id}-qty`).should('have.text', '2');
      cy.visitApp('/cart');
      cy.byTestId(`cart-pod-${pod.pod_id}`).should('contain.text', pod.pod_title);
      cy.byTestId(`cart-line-${product.id}-qty`).should('have.text', '2');
      // The cart is mirrored to the server for the reminder email: leave it empty.
      clearCart();
    });
  });
});
