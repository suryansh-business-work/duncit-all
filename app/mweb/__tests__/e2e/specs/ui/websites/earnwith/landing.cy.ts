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
 * the header links to duncit.com and mWeb sign-in / sign-up, and the four earn
 * paths handing off to the mWeb partner surveys (config/site-config.ts).
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
    cy.get('h1').should('readText', t('website.earn.hero.heading'));
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
    for (const link of outward) cy.contains('header a.nav-link', link.label).then(($a) => expectNewTab($a, link.href));
    cy.contains('header a.nav-link', t('website.earn.nav.howItWorks')).should('have.attr', 'href', '#how').and('not.have.attr', 'target');
    cy.contains('header a', t('website.earn.nav.login')).then(($a) => expectNewTab($a, linkUrl('mweb', '/login')));
    cy.contains('header a', t('website.earn.nav.signup')).then(($a) => expectNewTab($a, linkUrl('mweb', '/register')));
  });

  it('EARN-04 the four earn paths each hand off to their mWeb survey', () => {
    const paths = [
      { title: t('website.earn.paths.venueTitle'), cta: t('website.earn.paths.venueCta'), href: linkUrl('mweb', '/survey/venue') },
      { title: t('website.earn.paths.hostTitle'), cta: t('website.earn.paths.hostCta'), href: linkUrl('mweb', '/survey/host') },
      { title: t('website.earn.paths.clubTitle'), cta: t('website.earn.paths.clubCta'), href: linkUrl('mweb', '/survey/club_admin') },
      { title: t('website.earn.paths.brandTitle'), cta: t('website.earn.paths.brandCta'), href: linkUrl('mweb', '/survey/ecomm') },
    ];
    visitSite('earnwith');
    cy.get('#paths article').should('have.length', paths.length);
    paths.forEach((path, index) => {
      cy.get('#paths article').eq(index).within(() => {
        cy.get('h3').should('readText', path.title);
        cy.get('img').should('have.attr', 'alt').and('not.be.empty');
        cy.contains('a', path.cta).then(($a) => expectNewTab($a, path.href));
      });
    });
  });

  it('EARN-05 with no screenshots configured the screenshots section is not rendered at all', () => {
    visitSite('earnwith');
    cy.get('main').should('not.contain.text', t('website.earn.screenshots.heading'));
    cy.get('main figure').should('not.exist');
  });
});
