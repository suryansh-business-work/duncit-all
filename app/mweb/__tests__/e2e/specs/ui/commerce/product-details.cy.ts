/// <reference types="cypress" />
import { runAccount } from '../../../support/run-account';
import {
  NO_SUCH_ID,
  clearCart,
  declineTracking,
  requireProductsOn,
  rupees,
  stockedProduct,
  variantName,
  visitAndWait,
  waitCartMirrorEmpty,
  type ProductDetail,
} from '../../../support/ui-apps-3';

/**
 * Product details, live (scenario map › Product details).
 *
 * /product/:productId reads `publicInventoryProduct` and `podsForProduct`
 * (ProductDetailPage): the first variant is selected, a variant pill swaps the
 * price, and the buy bar adds from the cheapest live pod that stocks the
 * product, never past that pod's stock. The cart is this browser's
 * localStorage — nothing is bought. Products are read from the shop's own
 * catalogue first; a product id no product has shows "Product not found.".
 */

/** The price the page shows for a variant — the variant's own, else the product's. */
const shownPrice = (detail: ProductDetail, variantIndex: number): string =>
  rupees(detail.variants[variantIndex]?.unit_cost ?? detail.unit_cost);

/** The most "+" taps the stock-limit scenario will make. */
const MAX_STEPS = 10;

const openProduct = (productId: string) => visitAndWait(`/product/${productId}`, 'PodsForProduct');

describe('Product details', () => {
  const account = runAccount();

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    requireProductsOn();
  });

  beforeEach(() => {
    declineTracking();
  });

  it('PD-01 the page shows the name, the first variant’s price and a buy bar', () => {
    stockedProduct(1).then(({ detail }) => {
      openProduct(detail.id);
      cy.byTestId('product-detail-screen').should('be.visible');
      cy.byTestId('product-detail-name').should('have.text', detail.product_name);
      cy.byTestId('product-detail-price').should('have.text', shownPrice(detail, 0));
      cy.byTestId('product-buy-bar-price').should('have.text', shownPrice(detail, 0));
      cy.byTestId('product-detail-add').should('be.enabled');
      cy.byTestId('product-detail-no-pod').should('not.exist');
      if (detail.brand_name) {
        cy.byTestId('product-detail-brand').should('have.text', `by ${detail.brand_name}`);
      } else {
        cy.byTestId('product-detail-brand').should('not.exist');
      }
    });
  });

  it('PD-02 a variant pill becomes the selected one and swaps the price', () => {
    stockedProduct(1, (detail) => detail.variants.length >= 2, 'stocked product with two or more variants').then(
      ({ detail }) => {
        const [firstVariant, secondVariant] = detail.variants;
        openProduct(detail.id);
        cy.byTestId(`variant-${firstVariant.id}`).should('have.attr', 'aria-pressed', 'true');
        cy.byTestId(`variant-${secondVariant.id}`)
          .should('have.attr', 'aria-pressed', 'false')
          .and('have.text', variantName(secondVariant))
          .click();
        cy.byTestId(`variant-${secondVariant.id}`).should('have.attr', 'aria-pressed', 'true');
        cy.byTestId(`variant-${firstVariant.id}`).should('have.attr', 'aria-pressed', 'false');
        cy.byTestId('product-detail-price').should('have.text', shownPrice(detail, 1));
      },
    );
  });

  it('PD-03 the buy bar adds one, steps up and down, and removes the line', () => {
    stockedProduct(2).then(({ detail }) => {
      openProduct(detail.id);
      cy.byTestId('product-detail-add').click();
      cy.byTestId('product-detail-qty').should('have.text', '1');
      cy.byTestId('product-detail-inc').should('be.enabled').click();
      cy.byTestId('product-detail-qty').should('have.text', '2');
      cy.byTestId('product-detail-dec').click();
      cy.byTestId('product-detail-qty').should('have.text', '1');
      // At one, the minus is the bin: the line leaves the cart and the "+" comes back.
      cy.interceptOperation('SyncMyProductCart');
      cy.byTestId('product-detail-dec').click();
      cy.byTestId('product-detail-qty').should('not.exist');
      cy.byTestId('product-detail-add').should('be.enabled');
      // The emptied cart reaches the server's mirror at once (useCartServerSync).
      waitCartMirrorEmpty();
    });
  });

  it('PD-04 the "+" stops at the pod’s stock', () => {
    // A pod holding a handful of units lets the limit be reached tap by tap.
    stockedProduct(
      2,
      (_detail, pod) => pod.available_count <= MAX_STEPS,
      `product whose cheapest pod holds between 2 and ${MAX_STEPS} units`,
    ).then(({ detail, pod }) => {
      openProduct(detail.id);
      cy.byTestId('product-detail-add').click();
      for (let quantity = 2; quantity <= pod.available_count; quantity += 1) {
        cy.byTestId('product-detail-inc').click();
        cy.byTestId('product-detail-qty').should('have.text', String(quantity));
      }
      cy.byTestId('product-detail-inc').should('be.disabled');
      clearCart();
    });
  });

  it('PD-05 a product id no product has says "Product not found."', () => {
    visitAndWait(`/product/${NO_SUCH_ID}`, 'PublicInventoryProduct');
    cy.byTestId('product-detail-not-found').should('have.text', 'Product not found.');
    cy.byTestId('product-buy-bar').should('not.exist');
  });
});
