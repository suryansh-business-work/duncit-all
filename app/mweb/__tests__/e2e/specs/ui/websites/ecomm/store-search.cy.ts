/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import { storeCopy, storeProduct, storeSettings, useStoreDesktop, visitSite, type StoreCard } from '../../../../support/ui-websites';

/**
 * Pet store search (src/components/header/search-form): a debounced type-ahead
 * (EcommStoreSuggest, two characters and up) listing products, aisles and
 * brands plus a "search for …" row, and /search?q= — the shelf narrowed by the
 * query (EcommStoreSearch), with its empty state when nothing matches.
 */
describe('UI Pet store · Search', () => {
  let t: Translator['t'];
  let product: StoreCard;

  before(() => {
    storeCopy().then((copy) => {
      t = copy;
    });
    storeSettings();
    storeProduct((card) => card.title.trim().length >= 3, 'with a searchable title').then((card) => {
      product = card;
    });
  });

  beforeEach(() => {
    useStoreDesktop();
  });

  const searchBox = () => cy.get(`header input[aria-label="${t('ecommStore.search.label')}"]`).first();
  const query = (): string => product.title.trim().split(/\s+/)[0].slice(0, 12);

  it('SRCH-01 typing suggests the matching products from the server, then a row to search for the text', () => {
    cy.interceptOperation('EcommStoreSuggest');
    visitSite('ecomm', '/shop');
    searchBox().type(query());
    cy.wait('@EcommStoreSuggest').then(({ request, response }) => {
      expect(request.body.variables.q).to.eq(query());
      const found = response?.body?.data?.storeSuggest as { products: { title: string }[]; categories: { name: string }[]; brands: { name: string }[] };
      const rows = [...found.products.map((p) => p.title), ...found.categories.map((c) => c.name), ...found.brands.map((b) => b.name)];
      cy.get('[role="listbox"] [role="option"]').should('have.length', rows.length + 1);
      rows.forEach((label, index) => cy.get('[role="listbox"] [role="option"]').eq(index).should('contain.text', label));
      cy.get('[role="listbox"] [role="option"]').last().should('readText', t('ecommStore.search.searchFor', { vars: { q: query() } }));
    });
  });

  it('SRCH-02 Enter opens /search?q= with the shelf the server answers for it', () => {
    cy.interceptOperation('EcommStoreSearch');
    visitSite('ecomm', '/shop');
    cy.wait('@EcommStoreSearch');
    searchBox().type(`${query()}{enter}`);
    cy.location('pathname').should('eq', '/search');
    cy.location('search').should('eq', `?q=${encodeURIComponent(query())}`);
    cy.wait('@EcommStoreSearch').then(({ request, response }) => {
      expect(request.body.variables.input.q).to.eq(query());
      const items = (response?.body?.data?.storeSearch?.items ?? []) as { slug: string }[];
      cy.get('main .product-card').should('have.length', items.length);
    });
    cy.contains('main', t('ecommStore.shelf.searchTitle', { vars: { q: query() } })).should('exist');
  });

  it('SRCH-03 a query nothing matches shows the empty shelf with a way to clear the filters', () => {
    const nonsense = 'zzqe2enomatchxx';
    cy.interceptOperation('EcommStoreSearch');
    visitSite('ecomm', `/search?q=${nonsense}`);
    cy.wait('@EcommStoreSearch').its('response.body.data.storeSearch.items').should('have.length', 0);
    cy.get('main [data-testid="SearchOffRoundedIcon"]').should('exist');
    cy.get('main').should('contain.text', t('ecommStore.shelf.emptyTitle'));
    cy.contains('main button', t('ecommStore.filters.clearAll')).should('exist');
  });
});
