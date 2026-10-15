/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import { storeCopy, storeProduct, storeSettings, useStoreDesktop, visitSite, type StoreCard } from '../../../../support/ui-websites';

/**
 * The pet store wishlist for a guest (components/product-card/WishlistButton.tsx,
 * app/providers/WishlistProvider.tsx, pages/wishlist): the heart is a pressed
 * toggle backed by EcommStoreToggleWishlist under the guest cart key, the saved
 * product appears on /wishlist, and toggling again removes it.
 */
describe('UI Pet store · Wishlist', () => {
  let t: Translator['t'];
  let product: StoreCard;

  before(() => {
    storeCopy().then((copy) => {
      t = copy;
    });
    storeSettings();
    storeProduct(() => true, '').then((card) => {
      product = card;
    });
  });

  beforeEach(() => {
    useStoreDesktop();
  });

  const heart = () => cy.get(`main button[aria-label="${t('ecommStore.wishlist.toggle', { vars: { name: product.title } })}"]`).first();

  it('WISH-01 the heart saves the product, shows it pressed, and /wishlist lists it until it is toggled off', () => {
    cy.interceptOperation('EcommStoreProduct');
    visitSite('ecomm', `/p/${encodeURIComponent(product.slug)}`);
    cy.wait('@EcommStoreProduct');
    heart().should('have.attr', 'aria-pressed', 'false');
    cy.interceptOperation('EcommStoreToggleWishlist');
    heart().click();
    cy.wait('@EcommStoreToggleWishlist').then(({ request, response }) => {
      expect(request.body.variables.product_id).to.eq(product.id);
      expect(response?.body?.data?.storeToggleWishlist).to.include(product.id);
    });
    heart().should('have.attr', 'aria-pressed', 'true');

    cy.interceptOperation('EcommStoreWishlist');
    visitSite('ecomm', '/wishlist');
    cy.wait('@EcommStoreWishlist').its('response.body.data.storeWishlist').then((items: { id: string }[]) => {
      expect(items.map((item) => item.id)).to.include(product.id);
    });
    cy.get(`main .product-card a[href="/p/${encodeURIComponent(product.slug)}"]`).should('exist');
    heart().should('have.attr', 'aria-pressed', 'true').click();
    cy.wait('@EcommStoreToggleWishlist').its('response.body.data.storeToggleWishlist').should('not.include', product.id);
    // Unsaved, the card either leaves the list or stays with its heart released.
    const selector = `button[aria-label="${t('ecommStore.wishlist.toggle', { vars: { name: product.title } })}"]`;
    cy.get('main').should(($main) => {
      const button = $main.find(selector);
      expect(button.length === 0 || button.first().attr('aria-pressed') === 'false', 'no longer saved').to.eq(true);
    });
  });
});
