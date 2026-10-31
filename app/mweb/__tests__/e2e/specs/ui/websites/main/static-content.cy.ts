/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  CENTER_SCROLL,
  ctaBandLine,
  expectMainSite404,
  expectSiteMeta,
  fetchHtml,
  linkUrl,
  siteBranding,
  siteUrl,
  visitSite,
  websiteCopy,
  type SiteBranding,
} from '../../../../support/ui-websites';

/**
 * duncit.com's static, localized pages (website/main-website/src/pages):
 * About, Community, Guidelines, the four Safety Hub pages and the branded 404
 * the Node server answers unknown paths with (server/main.ts notFound).
 */

/** Every PageLayout page heads itself "<heading> — Duncit" and builds its card from that. */
const pageTitle = (heading: string): string => `${heading} — Duncit`;

/** Astro builds each page as a directory, so a page names itself canonical with the trailing slash (the sitemap lists the same). */
const canonicalOf = (path: string): string => linkUrl('mainSite', `${path}/`);

describe('UI duncit.com · Static content', CENTER_SCROLL, () => {
  let t: Translator['t'];
  let branding: SiteBranding;

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
    });
    siteBranding().then((found) => {
      branding = found;
    });
  });

  it('STC-01 About renders its eyebrow, heading, intro and the why, beliefs, going and team sections', () => {
    visitSite('main', '/about');
    // PageLayout.astro: the eyebrow badge sits right before the heading, the intro right after it.
    cy.get('[data-page-heading]').prev('span').should('readText', t('website.main.about.eyebrow'));
    cy.get('[data-page-heading]').should('readText', t('website.main.about.heading'));
    cy.get('[data-page-heading]').next('p').should('readText', t('website.main.about.intro'));
    for (const key of ['whyHeading', 'believeHeading', 'goingHeading', 'teamHeading']) {
      cy.get('article h2').should('contain.text', t(`website.main.about.${key}`));
    }
    cy.contains('article h2', t('website.main.about.believeHeading')).closest('section').find('ul > li').as('beliefs');
    cy.get('@beliefs').should('have.length', 4);
    for (let belief = 1; belief <= 4; belief += 1) {
      cy.get('@beliefs').eq(belief - 1).find('h3').should('readText', t(`website.main.about.believe${belief}Label`));
    }
  });

  it('STC-02 the download link in the About text opens /#download', () => {
    visitSite('main', '/about');
    cy.contains('article a', t('website.main.about.goingLink')).should('have.attr', 'href', '/#download').click();
    cy.location('pathname').should('eq', '/');
    cy.location('hash').should('eq', '#download');
  });

  it('STC-03 Community links the guidelines, which open with their six rule sections', () => {
    visitSite('main', '/community');
    cy.get('[data-page-heading]').should('readText', t('website.main.community.heading'));
    cy.contains('article a', t('website.main.community.rulesLink')).should('have.attr', 'href', '/guidelines').click();
    cy.location('pathname').should('eq', '/guidelines');
    for (let rule = 1; rule <= 6; rule += 1) {
      cy.get('article h3').should('contain.text', t(`website.main.guidelines.rule${rule}Heading`));
    }
    cy.get(`article a[href="mailto:${branding.support_email}"]`).should('exist');
  });

  it('STC-04 each Safety Hub page answers 200 with its own heading and card', () => {
    const pages = [
      { path: '/safety/approach', ns: 'safetyApproach' },
      { path: '/safety/advice', ns: 'safetyAdvice' },
      { path: '/safety/tools', ns: 'safetyTools' },
      { path: '/safety/resources', ns: 'safetyResources' },
    ];
    for (const page of pages) {
      fetchHtml(siteUrl('main', page.path)).then(({ status, doc }) => {
        expect(status, page.path).to.eq(200);
        const heading = t(`website.main.${page.ns}.heading`);
        expect(doc.querySelector('[data-page-heading]')?.textContent?.replaceAll(/\s+/g, ' ').trim()).to.eq(heading);
        expectSiteMeta(doc, { title: pageTitle(heading), siteName: branding.app_name, canonical: canonicalOf(page.path) });
      });
    }
  });

  it('STC-05 Safety advice links on to the resources page, which links the support email', () => {
    visitSite('main', '/safety/advice');
    cy.contains('article a', t('website.main.safetyAdvice.helpLink')).should('have.attr', 'href', '/safety/resources').click();
    cy.location('pathname').should('eq', '/safety/resources');
    ctaBandLine(t('website.main.safetyResources.supportHeading'))
      .find(`a[href="mailto:${branding.support_email}"]`)
      .should('readText', branding.support_email);
  });

  it('STC-06 Careers carries a canonical, og:site_name from branding and its own card', () => {
    fetchHtml(siteUrl('main', '/careers')).then(({ doc }) => {
      expectSiteMeta(doc, {
        title: pageTitle(t('website.main.careers.heading')),
        siteName: branding.app_name,
        canonical: canonicalOf('/careers'),
      });
    });
  });

  it('STC-07 an unknown path is a real 404 with the branded page, whose buttons go home and to help', () => {
    fetchHtml(siteUrl('main', '/nope/nowhere')).then(({ status, doc }) => {
      expect(status).to.eq(404);
      expectMainSite404(doc, '/nope/nowhere');
    });
    visitSite('main', '/nope/nowhere', { failOnStatusCode: false });
    cy.get('main h1').invoke('text').should('match', /^\s*404\s*$/);
    // The stickers floating round the 404; two more join them from `sm` up.
    for (const sticker of ['lost', 'offMap', 'tryAgain', 'weGotYou']) {
      cy.contains('main span[aria-hidden="true"]', t(`website.main.notFound.${sticker}`)).should('be.visible');
    }
    cy.contains('p', t('website.main.notFound.text')).should('exist');
    cy.contains('a[href="/"]', t('website.main.notFound.takeMeHome')).should('exist');
    cy.contains('a[href="/help"]', t('website.main.notFound.getHelp')).click();
    cy.location('pathname').should('eq', '/help');
  });
});
