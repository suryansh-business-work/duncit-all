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
 * ads.duncit.com landing (website/ads-website): the overlay header that goes
 * solid on scroll (@duncit/brand/widgets/site-header), its anchors, the theme
 * toggle and the phone drawer (SiteMenu.astro), the hero CTAs, the design
 * service section, the CTA band and the 404 page. Copy is the site's build-time
 * translator (config/site-config.ts).
 */
describe('UI Ads website · Landing', () => {
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

  const anchors = (): { label: string; href: string }[] => [
    { label: t('website.ads.nav.placements'), href: '#placements' },
    { label: t('website.ads.nav.pricing'), href: '#calculator' },
    { label: t('website.ads.nav.design'), href: '#design' },
    { label: t('website.ads.nav.how'), href: '#how' },
    { label: t('website.ads.nav.why'), href: '#why' },
  ];

  it('ADS-01 the head carries the ads title, description and canonical', () => {
    fetchHtml(siteUrl('ads', '/')).then(({ status, doc }) => {
      expect(status).to.eq(200);
      expectSiteMeta(doc, {
        title: t('website.ads.brand.title'),
        siteName: branding.app_name,
        canonical: linkUrl('adsSite', '/'),
        description: t('website.ads.brand.description'),
      });
    });
  });

  it('ADS-02 the header is transparent over the hero and turns solid once the page scrolls', () => {
    useDesktop();
    visitSite('ads');
    cy.get('header[data-cms-widget="site-header"]').should('have.attr', 'data-overlay', 'true').and('have.class', 'at-top');
    cy.scrollTo(0, 400);
    cy.get('header[data-cms-widget="site-header"]').should('not.have.class', 'at-top');
    cy.scrollTo(0, 0);
    cy.get('header[data-cms-widget="site-header"]').should('have.class', 'at-top');
  });

  it('ADS-03 each nav anchor scrolls to its section', () => {
    useDesktop();
    visitSite('ads');
    for (const anchor of anchors()) {
      cy.contains('header a.nav-link', anchor.label).should('have.attr', 'href', anchor.href).click();
      cy.get(anchor.href).should(expectInViewport);
    }
  });

  it('ADS-04 the hero primary CTA opens the Ads console in a new tab; the secondary scrolls to the calculator', () => {
    visitSite('ads');
    cy.get('h1').should('readText', t('website.ads.hero.heading'));
    cy.contains('main section a', t('website.ads.hero.primaryCta')).then(($cta) => expectNewTab($cta, linkUrl('adsPortal')));
    cy.contains('main section a', t('website.ads.hero.secondaryCta')).should('have.attr', 'href', '#calculator').click();
    cy.get('#calculator').should(expectInViewport);
  });

  it('ADS-05 the moon toggle switches to dark, shows a sun, presses itself and remembers dark', () => {
    visitSite('ads');
    cy.get('html').should('have.attr', 'data-theme', 'light');
    cy.get('header [data-theme-toggle]').should('have.attr', 'aria-label', t('website.ads.header.themeToggle')).click();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('header [data-theme-toggle]').should('have.attr', 'aria-pressed', 'true');
    cy.get('header [data-theme-icon]').should('have.class', 'fa-sun');
    cy.window().its('localStorage').invoke('getItem', 'duncit-theme').should('eq', 'dark');
  });

  it('ADS-06 at phone width the drawer lists the anchors plus Sign up and Log in into the Ads console', () => {
    visitSite('ads');
    cy.get('header a.nav-link').first().should('not.be.visible');
    cy.get('[data-site-menu-open]').should('have.attr', 'aria-expanded', 'false').click();
    cy.get('#siteMenuDrawer').should('have.attr', 'aria-hidden', 'false');
    cy.get('[data-site-menu-open]').should('have.attr', 'aria-expanded', 'true');
    for (const anchor of anchors()) cy.contains('#siteMenuDrawer .site-menu-nav a', anchor.label).should('have.attr', 'href', anchor.href);
    cy.contains('#siteMenuDrawer .site-menu-actions a', t('website.ads.nav.signup')).should('have.attr', 'href', linkUrl('adsPortal'));
    cy.contains('#siteMenuDrawer .site-menu-actions a', t('website.ads.nav.login')).should('have.attr', 'href', linkUrl('adsPortal'));
    cy.get('#siteMenuDrawer [data-site-menu-close]').click();
    cy.get('#siteMenuDrawer').should('have.attr', 'aria-hidden', 'true');
  });

  it('ADS-07 the design section shows its four services and its CTA opens the Ads console in a new tab', () => {
    visitSite('ads');
    cy.get('#design h2').should('readText', t('website.ads.design.heading'));
    cy.get('#design ul > li').should('have.length', 4);
    for (const key of ['builtTitle', 'formatTitle', 'roundsTitle', 'swapTitle']) cy.get('#design h3').should('contain.text', t(`website.ads.design.${key}`));
    cy.contains('#design a', t('website.ads.design.cta')).then(($cta) => expectNewTab($cta, linkUrl('adsPortal')));
    cy.get('#design').should('contain.text', t('website.ads.design.note'));
  });

  it('ADS-08 the CTA band button opens the Ads console in a new tab', () => {
    visitSite('ads');
    cy.contains('a', t('website.ads.cta.button')).then(($cta) => expectNewTab($cta, linkUrl('adsPortal')));
  });

  it('ADS-09 an unknown path renders the ads 404 page', () => {
    visitSite('ads', '/e2e-no-such-page', { failOnStatusCode: false });
    cy.get('main h1').should('readText', t('website.ads.notFound.heading'));
    cy.get('main').should('contain.text', t('website.ads.notFound.text'));
    cy.contains('main a[href="/"]', 'Back home').should('exist');
  });

  it('ADS-10 the deployed site answers an unknown path with its 404 page and status 404', () => {
    cy.request({ url: `${linkUrl('adsSite')}/e2e-no-such-page`, failOnStatusCode: false }).its('status').should('eq', 404);
  });
});
