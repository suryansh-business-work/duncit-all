/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  expectInViewport,
  expectNewTab,
  expectSiteMeta,
  fetchHtml,
  linkUrl,
  siteBranding,
  siteUrl,
  useDesktop,
  visitSite,
  websiteCopy,
  type SiteBranding,
} from '../../../../support/ui-websites';

/**
 * earnwith.duncit.com landing (website/earnwith-website): hero CTAs into mWeb,
 * the header links to duncit.com and mWeb sign-in / sign-up, and the five earn
 * paths handing off to their mWeb journeys (config/site-config.ts `paths`,
 * components/EarnPaths.astro).
 */
describe('UI Earn With website · Landing', () => {
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

  it('EARN-01 the head carries the earnwith title, description and canonical', () => {
    fetchHtml(siteUrl('earnwith', '/')).then(({ status, doc }) => {
      expect(status).to.eq(200);
      expectSiteMeta(doc, {
        title: t('website.earn.brand.title'),
        siteName: branding.app_name,
        canonical: linkUrl('earnwith', '/'),
        description: t('website.earn.brand.description'),
      });
    });
  });

  it('EARN-02 the hero primary CTA opens mWeb /earn in a new tab; the secondary scrolls to the paths', () => {
    visitSite('earnwith');
    // Hero.astro renders the h1 as a lead and an accented half, one sentence.
    cy.get('h1').should('readText', `${t('website.earn.hero.headingLead')} ${t('website.earn.hero.headingAccent')}`);
    cy.contains('main section a', t('website.earn.hero.primaryCta')).then(($a) => expectNewTab($a, linkUrl('mweb', '/earn')));
    cy.contains('main section a', t('website.earn.hero.secondaryCta')).should('have.attr', 'href', '#paths').click();
    cy.get('#paths').should(expectInViewport);
  });

  it('EARN-03 the header links About us, Resources and Blog on duncit.com, and Log in / Sign up on mWeb', () => {
    useDesktop();
    visitSite('earnwith');
    const outward = [
      { label: t('website.earn.nav.aboutUs'), href: linkUrl('mainSite', '/about') },
      { label: t('website.earn.nav.resources'), href: linkUrl('mainSite', '/safety/resources') },
      { label: t('website.earn.nav.blog'), href: linkUrl('mainSite', '/blog') },
    ];
    for (const link of outward) cy.contains('header nav a', link.label).then(($a) => expectNewTab($a, link.href));
    cy.contains('header nav a', t('website.earn.nav.howItWorks')).should('have.attr', 'href', '#how').and('not.have.attr', 'target');
    cy.contains('header a', t('website.earn.nav.login')).then(($a) => expectNewTab($a, linkUrl('mweb', '/login')));
    cy.contains('header a', t('website.earn.nav.signup')).then(($a) => expectNewTab($a, linkUrl('mweb', '/register')));
  });

  it('EARN-04 the five earn paths each hand off to their mWeb journey', () => {
    // Four survey gates, and the gig path's self-serve freelancer profile.
    const paths = [
      { key: 'venue', href: linkUrl('mweb', '/survey/venue') },
      { key: 'host', href: linkUrl('mweb', '/survey/host') },
      { key: 'club', href: linkUrl('mweb', '/survey/club_admin') },
      { key: 'brand', href: linkUrl('mweb', '/survey/ecomm') },
      { key: 'gig', href: linkUrl('mweb', '/earn/freelancer') },
    ];
    const slides = '#paths [data-paths-track] > div';
    visitSite('earnwith');
    cy.get(slides).should('have.length', paths.length);
    paths.forEach((path, index) => {
      // EarnPaths.astro: each card is one link, carrying its title and its CTA.
      cy.get(slides).eq(index).within(() => {
        cy.get('a')
          .should('contain.text', t(`website.earn.paths.${path.key}Title`))
          .and('contain.text', t(`website.earn.paths.${path.key}Cta`))
          .then(($a) => expectNewTab($a, path.href));
        cy.get('img').should('have.attr', 'alt').and('not.be.empty');
      });
    });
  });

  it('EARN-05 with no screenshots configured the screenshots section is not rendered at all', () => {
    visitSite('earnwith');
    cy.get('main').should('not.contain.text', t('website.earn.screenshots.heading'));
    // A screenshot card is a captioned figure (EarningsShots.astro); the CTA
    // band's photograph is a figure too, but carries no caption.
    cy.get('main figure:has(figcaption)').should('not.exist');
  });
});
