/// <reference types="cypress" />
import {
  storeMoney,
  storeSettings,
  useStoreDesktop,
  visitSite,
} from '../../../../support/ui-websites';

/**
 * Pet store browsing (website/ecomm-store — ecomm.duncit.com, never the Partner
 * Brand console): home, /shop, and the category, collection, brand and pet-type
 * shelves (src/app/router.tsx), each a ShelfView over EcommStoreSearch whose
 * cards (components/product-card) are the server's own items. An unknown slug
 * renders the NotFoundContent body (PetsRounded icon, a way home).
 */

interface Card {
  id: string;
  slug: string;
  title: string;
  price: number;
}

interface Navigation {
  pet_types: { name: string; slug: string }[];
  categories: { name: string; slug: string }[];
  collections: { name: string; slug: string }[];
}

const NAVIGATION = `query E2eStoreNavigation { storeNavigation { pet_types { name slug } categories { name slug } collections { name slug } } }`;
const BRANDS = `query E2eStoreBrands { storeBrands { name slug } }`;

describe('UI Pet store · Browsing', () => {
  let symbol: string;
  let nav: Navigation;
  let brands: { name: string; slug: string }[];

  before(() => {
    storeSettings().then((settings) => {
      symbol = settings.currency_symbol;
    });
    cy.gql<{ storeNavigation: Navigation }>(NAVIGATION, {}, { token: null }).then((data) => {
      nav = data.storeNavigation;
    });
    cy.gql<{ storeBrands: { name: string; slug: string }[] }>(BRANDS, {}, { token: null }).then((data) => {
      brands = data.storeBrands;
    });
  });

  beforeEach(() => {
    useStoreDesktop();
  });

  /** The shelf grid shows exactly the cards the server answered, each linked and priced. */
  function expectShelf(alias: string): void {
    cy.get(alias).then((interception) => {
      const { response } = interception as unknown as { response?: { body?: { data?: { storeSearch?: { items?: Card[] } } } } };
      const items = response?.body?.data?.storeSearch?.items ?? [];
      if (!items.length) {
        cy.get('[data-testid="SearchOffRoundedIcon"]').should('exist');
        return;
      }
      cy.get('main ul > li .product-card').should('have.length', items.length);
      for (const item of items.slice(0, 6)) {
        cy.get(`main .product-card a[href="/p/${encodeURIComponent(item.slug)}"]`)
          .first()
          .should('contain.text', item.title)
          .closest('.product-card')
          .should('contain.text', storeMoney(item.price, symbol));
      }
    });
  }

  it('SHOP-01 home renders its sections from the store\'s own home layout', () => {
    cy.interceptOperation('EcommStoreHome');
    visitSite('ecomm');
    cy.wait('@EcommStoreHome').its('response.body.data.storeHome').should('be.an', 'array');
    cy.get('[data-testid="PetsRoundedIcon"]').should('not.exist');
  });

  it('SHOP-02 /shop lists the shelf with each card linking to its product and showing its price', () => {
    cy.interceptOperation('EcommStoreSearch');
    visitSite('ecomm', '/shop');
    cy.wait('@EcommStoreSearch');
    expectShelf('@EcommStoreSearch');
  });

  it('SHOP-03 a category shelf names the aisle and lists only its products', () => {
    const [category] = nav.categories;
    if (!category) throw new Error('Staging prerequisite: the pet store has no category (Ecomm Portal > Categories).');
    cy.interceptOperation('EcommStoreSearch');
    visitSite('ecomm', `/c/${encodeURIComponent(category.slug)}`);
    cy.contains('h1, h2', category.name).should('exist');
    cy.wait('@EcommStoreSearch').its('request.body.variables.input.category').should('eq', category.slug);
    expectShelf('@EcommStoreSearch');
  });

  it('SHOP-04 a collection opens its own shelf', () => {
    const [collection] = nav.collections;
    if (!collection) throw new Error('Staging prerequisite: the pet store has no collection (Ecomm Portal > Collections).');
    cy.interceptOperation('EcommStoreSearch');
    visitSite('ecomm', `/collections/${encodeURIComponent(collection.slug)}`);
    cy.contains('h1, h2', collection.name).should('exist');
    cy.wait('@EcommStoreSearch').its('request.body.variables.input.collection').should('eq', collection.slug);
    expectShelf('@EcommStoreSearch');
  });

  it('SHOP-05 a brand opens a shelf scoped to that brand', () => {
    const [brand] = brands;
    if (!brand) throw new Error('Staging prerequisite: the pet store has no brand.');
    cy.interceptOperation('EcommStoreSearch');
    visitSite('ecomm', `/brand/${encodeURIComponent(brand.slug)}`);
    cy.contains('h1, h2', brand.name).should('exist');
    cy.wait('@EcommStoreSearch').its('request.body.variables.input.brand_ids').should('have.length', 1);
    expectShelf('@EcommStoreSearch');
  });

  it('SHOP-06 a pet type opens its own page', () => {
    const [pet] = nav.pet_types;
    if (!pet) throw new Error('Staging prerequisite: the pet store has no pet type.');
    cy.interceptOperation('EcommStorePetType');
    visitSite('ecomm', `/pet/${encodeURIComponent(pet.slug)}`);
    cy.wait('@EcommStorePetType').its('response.body.data.storePetType.name').should('eq', pet.name);
    cy.contains('h1, h2', pet.name).should('exist');
  });

  it('SHOP-07 an unknown category, product or brand slug shows the not-found body with a way home', () => {
    for (const path of ['/c/e2e-no-such-aisle', '/p/e2e-no-such-product', '/brand/e2e-no-such-brand', '/e2e/nowhere']) {
      visitSite('ecomm', path);
      cy.get('[data-testid="PetsRoundedIcon"]').should('exist');
      cy.get('main a[href="/"]').should('exist');
    }
  });
});
