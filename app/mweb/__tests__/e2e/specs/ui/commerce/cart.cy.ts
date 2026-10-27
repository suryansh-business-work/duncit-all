/// <reference types="cypress" />
import { openFromMenu } from '../../../support/menu-steps';
import { runAccount } from '../../../support/run-account';
import {
  currencySymbol,
  declineTracking,
  lineKey,
  priceText,
  requireProductsOn,
  stockedProduct,
  visitAndWait,
  waitCartMirrorEmpty,
  type StockedProduct,
} from '../../../support/ui-apps-3';

/**
 * Cart, live (scenario map › Cart).
 *
 * The cart and the wishlist are this browser's localStorage (CartContext,
 * WishlistContext): lines are grouped per pod, priced at the pod's unit cost
 * (or the variant's), survive a reload, and the whole cart checks out as one
 * product payment on /product-checkout. Lines are added the way a member adds
 * them, from the product page's buy bar. Nothing is paid: the checkout
 * scenario stops on the checkout page.
 */
describe('Cart', { testIsolation: false }, () => {
  const account = runAccount();
  let stocked: StockedProduct;
  let currency = '₹';
  let key = '';
  let unitCost = 0;

  /** The product page's "+" — one more unit from the cheapest pod. */
  const addFromProductPage = (taps: number) => {
    visitAndWait(`/product/${stocked.product.id}`, 'PodsForProduct');
    cy.byTestId('product-detail-add').click();
    for (let quantity = 2; quantity <= taps; quantity += 1) {
      cy.byTestId('product-detail-inc').click();
    }
    cy.byTestId('product-detail-qty').should('have.text', String(taps));
  };

  const openCart = () => {
    cy.visitApp('/cart');
    cy.byTestId('cart-screen').should('be.visible');
  };

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    declineTracking();
    requireProductsOn();
    currencySymbol().then((symbol) => {
      currency = symbol;
    });
    stockedProduct(2).then((found) => {
      stocked = found;
      const variant = found.detail.variants[0];
      key = lineKey(found.product.id, variant?.id ?? '');
      unitCost = variant?.unit_cost ?? found.pod.unit_cost;
    });
  });

  it('CA-01 menu › Cart, with nothing in it, says so and leads to the Pod Shop', () => {
    openFromMenu('sidebar-item-Cart', '/cart');
    cy.byTestId('cart-header-title').should('have.text', 'Cart');
    cy.byTestId('cart-tab-cart').should('have.attr', 'aria-selected', 'true');
    cy.byTestId('cart-empty-title').should('have.text', 'Your cart is empty');
    cy.byTestId('cart-empty-action').should('have.text', 'Explore Pod Shop').click();
    cy.location('pathname').should('eq', '/shop');
  });

  it('CA-02 checkout with an empty cart says "Nothing to checkout" and leads back to the cart', () => {
    cy.visitApp('/product-checkout');
    cy.byTestId('product-checkout-empty-title').should('have.text', 'Nothing to checkout');
    cy.byTestId('product-checkout-empty-action').should('have.text', 'Back to cart').click();
    cy.location('pathname').should('eq', '/cart');
  });

  it('CA-03 two units from a product page sit under their pod, priced, and survive a reload', () => {
    addFromProductPage(2);
    openCart();
    cy.byTestId(`cart-pod-${stocked.pod.pod_id}`).should('contain.text', stocked.pod.pod_title);
    cy.byTestId(`cart-line-${key}-qty`).should('have.text', '2');
    cy.byTestId('cart-total').should('have.text', priceText(unitCost * 2, currency));
    cy.reload();
    cy.byTestId(`cart-line-${key}-qty`).should('have.text', '2');
    cy.byTestId('cart-total').should('have.text', priceText(unitCost * 2, currency));
  });

  it('CA-04 the minus steps the line down and the total follows', () => {
    cy.byTestId(`cart-line-${key}-dec`).click();
    cy.byTestId(`cart-line-${key}-qty`).should('have.text', '1');
    cy.byTestId('cart-total').should('have.text', priceText(unitCost, currency));
  });

  it('CA-05 Move to wishlist takes the line out of the cart, and Move to cart puts it back', () => {
    const wishKey = `${stocked.pod.pod_id}:${stocked.product.id}:${stocked.detail.variants[0]?.id ?? ''}`;
    cy.byTestId(`cart-move-wishlist-${key}`).should('have.text', 'Move to wishlist').click();
    cy.byTestId('cart-empty').should('be.visible');
    cy.byTestId('cart-tab-wishlist').click();
    cy.location('search').should('contain', 'selectedtab=wishlist');
    cy.byTestId(`wishlist-item-${wishKey}`).should('contain.text', stocked.pod.pod_title);
    cy.byTestId(`wishlist-move-cart-${wishKey}`).should('have.text', 'Move to cart').click();
    cy.byTestId('wishlist-empty-title').should('have.text', 'Your wishlist is empty');
    cy.byTestId('cart-tab-cart').click();
    cy.byTestId(`cart-line-${key}-qty`).should('have.text', '1');
  });

  it('CA-06 Proceed to checkout opens the product checkout for the whole cart', () => {
    cy.byTestId('cart-checkout').should('have.text', 'Proceed to checkout').click();
    cy.location('pathname').should('eq', '/product-checkout');
    cy.byTestId('product-checkout-page-header-title').should('have.text', 'Product checkout');
    cy.byTestId('product-checkout-empty').should('not.exist');
  });

  it('CA-07 the bin removes the line, and its empty pod group goes with it', () => {
    openCart();
    cy.interceptOperation('SyncMyProductCart');
    cy.byTestId(`cart-remove-${key}`).click();
    cy.byTestId(`cart-pod-${stocked.pod.pod_id}`).should('not.exist');
    cy.byTestId('cart-empty-title').should('have.text', 'Your cart is empty');
    // A signed-in cart is mirrored for the reminder email; the emptied one goes at once.
    waitCartMirrorEmpty();
  });

  it('CA-08 Clear cart empties every line', () => {
    addFromProductPage(1);
    openCart();
    cy.byTestId(`cart-line-${key}-qty`).should('have.text', '1');
    cy.interceptOperation('SyncMyProductCart');
    cy.byTestId('cart-clear').should('have.text', 'Clear cart').click();
    cy.byTestId('cart-empty-title').should('have.text', 'Your cart is empty');
    waitCartMirrorEmpty();
    cy.reload();
    cy.byTestId('cart-empty').should('be.visible');
  });
});
