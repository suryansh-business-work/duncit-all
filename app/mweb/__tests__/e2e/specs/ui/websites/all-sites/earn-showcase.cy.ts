/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import { linkUrl, visitSite, websiteCopy, type SiteKey } from '../../../../support/ui-websites';

/**
 * The "Earn with Duncit" showcase (@duncit/brand EarnShowcase.astro) on every
 * home page except earnwith's own: its words, a decorative photo wall hidden
 * from screen readers, and one CTA to earnwith.duncit.com. The section also
 * holds the floating Earn pill (EarnPill.astro), whose link only jumps back to
 * the section itself.
 */

const ROOT = 'section[data-earn-showcase]';

describe('UI Websites · Earn showcase', () => {
  let t: Translator['t'];

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
    });
  });

  const sites: SiteKey[] = ['main', 'ads', 'partners'];
  for (const site of sites) {
    it(`SHOW-01 ${site} renders the showcase copy and its one CTA points at earnwith`, () => {
      visitSite(site);
      cy.get(ROOT).should('have.attr', 'aria-labelledby').then((id) => {
        cy.get(`[id="${id}"]`).should('contain.text', t('website.brand.earnShowcase.heading'));
      });
      cy.get(`${ROOT} .earn-eyebrow`).should('readText', t('website.brand.earnShowcase.eyebrow'));
      cy.get(`${ROOT} .earn-text`).should('readText', t('website.brand.earnShowcase.text'));
      cy.get(`${ROOT} .earn-wall`).should('have.attr', 'aria-hidden', 'true');
      cy.get(`${ROOT} a[data-earn-cta]`)
        .should('have.length', 1)
        .and('have.attr', 'href', linkUrl('earnwith'))
        .and('contain.text', t('website.brand.earnShowcase.cta'));
      // Every other link in the section is the Earn pill's jump to this section, so the CTA is the only way out.
      cy.get(ROOT).then(($section) => {
        const self = `#${$section.attr('id') ?? ''}`;
        $section.find('a').not('[data-earn-cta]').each((_, link) => {
          expect(link.getAttribute('href'), 'Earn pill link').to.eq(self);
        });
      });
    });
  }

  it('SHOW-02 earnwith does not advertise itself', () => {
    visitSite('earnwith');
    cy.get(ROOT).should('not.exist');
  });
});
