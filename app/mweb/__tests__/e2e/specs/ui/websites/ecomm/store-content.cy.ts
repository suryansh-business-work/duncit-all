/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import { storeCopy, storeProduct, storeSettings, useStoreDesktop, visitSite } from '../../../../support/ui-websites';

/**
 * Pet store content and chrome: the four built-in pages (/pages/shipping …,
 * PolicyPage.tsx, copy from store settings), an operator-written page
 * (StorePageView.tsx over EcommStorePage), the dark-mode toggle remembered as
 * ecomm_color_mode (ColorModeProvider.tsx), and no sideways scroll at phone width.
 */

const NAV_PAGES = `query E2eStorePages { storeNavigation { pages { id title slug } } }`;

describe('UI Pet store · Content and dark mode', () => {
  let t: Translator['t'];

  before(() => {
    storeCopy().then((copy) => {
      t = copy;
    });
    storeSettings();
  });

  it('INFO-01 each built-in page renders its title on the policy page', () => {
    useStoreDesktop();
    for (const slug of ['shipping', 'returns', 'terms', 'about']) {
      visitSite('ecomm', `/pages/${slug}`);
      cy.get('[data-testid="policy-page"] h1').should('readText', t(`ecommStore.pages.${slug}`));
    }
  });

  it('INFO-02 an operator-written page loads by its slug and is linked from the footer', () => {
    cy.gql<{ storeNavigation: { pages: { id: string; title: string; slug: string }[] } }>(NAV_PAGES, {}, { token: null }).then(({ storeNavigation }) => {
      const [page] = storeNavigation.pages;
      if (!page) throw new Error('Staging prerequisite: the pet store has no operator-written page (Ecomm Portal > Pages).');
      useStoreDesktop();
      cy.interceptOperation('EcommStorePage');
      visitSite('ecomm', '/');
      cy.get(`[data-testid="footer-page-${page.id}"]`).should('have.attr', 'href', `/pages/${page.slug}`).click();
      cy.wait('@EcommStorePage').its('request.body.variables.slug').should('eq', page.slug);
      cy.get('[data-testid="store-page"]').should('contain.text', page.title);
    });
  });

  it('INFO-03 the dark-mode toggle switches the store dark and the choice survives a reload', () => {
    useStoreDesktop();
    visitSite('ecomm', '/shop');
    cy.get(`header button[aria-label="${t('ecommStore.header.darkMode')}"]`).first().as('toggle');
    cy.get('@toggle').should('have.attr', 'aria-pressed', 'false').click();
    cy.get(`header button[aria-label="${t('ecommStore.header.darkMode')}"]`).first().should('have.attr', 'aria-pressed', 'true');
    cy.window().its('localStorage').invoke('getItem', 'ecomm_color_mode').should('eq', 'dark');
    cy.reload();
    cy.get(`header button[aria-label="${t('ecommStore.header.darkMode')}"]`).first().should('have.attr', 'aria-pressed', 'true');
  });

  it('INFO-04 at phone width no page scrolls sideways', () => {
    storeProduct(() => true, '').then((card) => {
      cy.viewport(375, 812);
      for (const path of ['/', '/shop', `/p/${encodeURIComponent(card.slug)}`, '/cart', '/pages/shipping']) {
        visitSite('ecomm', path);
        cy.get('main').should('be.visible');
        cy.document().should((doc) => {
          expect(doc.documentElement.scrollWidth, `${path} width`).to.be.at.most(doc.documentElement.clientWidth);
        });
      }
    });
  });
});
