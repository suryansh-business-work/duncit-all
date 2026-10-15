/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  storeCopy,
  storeMoney,
  storeProduct,
  storeSettings,
  useStoreDesktop,
  visitSite,
  type StoreCard,
} from '../../../../support/ui-websites';

/**
 * The pet store's guest cart (src/app/providers/CartProvider.tsx, pages/cart,
 * components/cart/CartLineRow.tsx with the shared CartQuantityControl): Add to
 * Cart on a product, stepping the quantity on /cart, the cart surviving a reload
 * under its guest key (lib/cartToken.ts, localStorage ecomm_cart_token), and
 * removing the line. Stops before checkout — no order, no payment. The cart is
 * a fresh guest cart per test (Cypress starts each with empty storage).
 */

interface CartLine {
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

const cartLines = (body: unknown): CartLine[] => {
  const data = (body as { data?: Record<string, { lines?: CartLine[] } | undefined> })?.data ?? {};
  const cart = Object.values(data)[0];
  return cart?.lines ?? [];
};

describe('UI Pet store · Cart', () => {
  let t: Translator['t'];
  let symbol: string;
  let product: StoreCard;

  before(() => {
    storeCopy().then((copy) => {
      t = copy;
    });
    storeSettings().then((settings) => {
      symbol = settings.currency_symbol;
    });
    storeProduct((card) => !card.has_variants, 'without variants to add to a cart').then((card) => {
      product = card;
    });
  });

  beforeEach(() => {
    useStoreDesktop();
  });

  /** Add the product from its page; yields the line the server put in the cart. */
  const addFromProductPage = (): Cypress.Chainable<CartLine> => {
    cy.interceptOperation('EcommStoreProduct');
    visitSite('ecomm', `/p/${encodeURIComponent(product.slug)}`);
    cy.wait('@EcommStoreProduct');
    cy.interceptOperation('EcommStoreAddToCart');
    cy.contains('main button', t('ecommStore.product.addToCart')).click();
    return cy.wait('@EcommStoreAddToCart').then(({ request, response }) => {
      expect(request.body.variables.product_id).to.eq(product.id);
      expect(request.body.variables.cart_token, 'guest cart key').to.be.a('string').and.not.be.empty;
      const line = cartLines(response?.body).find((l) => l.product_id === product.id);
      if (!line) throw new Error(`EcommStoreAddToCart did not put ${product.title} in the cart: ${JSON.stringify(response?.body?.errors ?? null)}`);
      return line;
    });
  };

  it('CART-01 Add to Cart puts the product in a guest cart, opens the cart drawer and counts it on the bag', () => {
    addFromProductPage().then((line) => {
      cy.window().its('localStorage').invoke('getItem', 'ecomm_cart_token').should('be.a', 'string');
      cy.get('[role="dialog"]').should('be.visible').and('contain.text', product.title);
      cy.get('header [data-testid="ShoppingBagOutlinedIcon"]').first().parent().should('contain.text', String(line.quantity));
    });
  });

  it('CART-02 on /cart the stepper raises the quantity, the line total follows, and a reload keeps it', () => {
    addFromProductPage().then(() => {
      visitSite('ecomm', '/cart');
      cy.get('main').should('contain.text', product.title);
      cy.get('main [data-testid="cart-line-qty"]').first().should('readText', '1');
      cy.interceptOperation('EcommStoreSetCartQty');
      cy.get('main [data-testid="cart-line-inc"]').first().click();
      cy.wait('@EcommStoreSetCartQty').then(({ request, response }) => {
        expect(request.body.variables.qty).to.eq(2);
        const line = cartLines(response?.body).find((l) => l.product_id === product.id);
        expect(line?.quantity, 'server quantity').to.eq(2);
        cy.get('main [data-testid="cart-line-qty"]').first().should('readText', '2');
        if (line) cy.get('main').should('contain.text', storeMoney(line.line_total, symbol));
      });
      cy.reload();
      cy.get('main [data-testid="cart-line-qty"]').first().should('readText', '2');
    });
  });

  it('CART-03 stepping down and removing the line empties the cart', () => {
    addFromProductPage().then(() => {
      visitSite('ecomm', '/cart');
      cy.interceptOperation('EcommStoreSetCartQty');
      cy.get('main [data-testid="DeleteOutlineRoundedIcon"]').first().parent().click();
      cy.wait('@EcommStoreSetCartQty').then(({ request, response }) => {
        expect(request.body.variables.qty).to.eq(0);
        expect(cartLines(response?.body).some((l) => l.product_id === product.id), 'line gone').to.eq(false);
      });
      cy.get('main [data-testid="cart-line-qty"]').should('not.exist');
      cy.get('main').should('not.contain.text', product.title);
    });
  });
});
