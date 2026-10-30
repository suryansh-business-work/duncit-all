/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  expectInViewport,
  expectSiteMeta,
  fetchHtml,
  linkUrl,
  siteBranding,
  siteUrl,
  squish,
  useDesktop,
  visitSite,
  websiteCopy,
  type SiteBranding,
} from '../../../../support/ui-websites';

/**
 * partners.duncit.com landing (website/partners-website/src/pages/index.astro,
 * components/home/Hero.astro, components/home/PartnerPaths.astro and
 * components/SiteHeader.astro): the join and login CTAs into the Partners app,
 * the hero proof points, the header brand mark and Log in, and the #ways /
 * #download anchors. Partner Brand (partners-app.duncit.com/ecomm-brand) is a
 * separate product and is not touched here.
 */
const HERO = 'section[aria-labelledby="hero-heading"]';

describe('UI Partners website · Landing', () => {
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

  it('PART-01 the head carries the partners title and canonical', () => {
    fetchHtml(siteUrl('partners', '/')).then(({ status, doc }) => {
      expect(status).to.eq(200);
      expectSiteMeta(doc, { title: t('website.partners.brand.title'), siteName: branding.app_name, canonical: linkUrl('partnersSite', '/') });
    });
  });

  it('PART-02 the hero offers Become a partner and Partner login into the Partners app, above its three proof points', () => {
    visitSite('partners');
    cy.get(`${HERO} h1`).should('readText', `${t('website.partners.hero.headingLead')} ${t('website.partners.hero.headingAccent')}`);
    cy.contains(`${HERO} a`, t('website.partners.nav.join')).should('have.attr', 'href', linkUrl('partnersApp', '/register-venue'));
    cy.contains(`${HERO} a`, t('website.partners.nav.login')).should('have.attr', 'href', linkUrl('partnersApp'));
    // landing.ts `proof`: the three marquee points, read out as text under the buttons.
    const proof = ['verified', 'console', 'payouts'].map((key) => t(`website.partners.marquee.${key}`));
    cy.get(`${HERO} ul > li`).should(($items) => {
      expect([...$items].map((item) => squish(item.textContent ?? '')), 'proof points').to.deep.eq(proof);
    });
  });

  it('PART-03 the brand mark goes to duncit.com and Log in to the Partners app', () => {
    visitSite('partners');
    cy.get(`header a[aria-label="${t('website.partners.nav.brandAria')}"]`).should('have.attr', 'href', linkUrl('mainSite'));
    cy.contains('header a', t('website.partners.nav.login')).should('have.attr', 'href', linkUrl('partnersApp'));
  });

  it('PART-04 How it works scrolls to the three partner paths and their console card, and Get the app to #download', () => {
    useDesktop();
    visitSite('partners');
    cy.contains('header nav a', t('website.partners.nav.how')).should('have.attr', 'href', '/#ways').click();
    cy.get('#ways').should(expectInViewport);
    const cards = ['venueName', 'clubName', 'brandName', 'consoleName'];
    cy.get('#ways article').should('have.length', cards.length);
    cards.forEach((key, index) => {
      cy.get('#ways article').eq(index).find('h3').should('readText', t(`website.partners.ways.${key}`));
    });
    cy.contains('header nav a', t('website.partners.nav.getApp')).should('have.attr', 'href', '/#download').click();
    cy.get('#download').should(expectInViewport);
  });

  it('PART-05 the phone drawer lists the same destinations plus Join and Log in', () => {
    visitSite('partners');
    cy.get('[data-site-menu-open]').click();
    cy.get('#siteMenuDrawer').should('have.attr', 'aria-hidden', 'false');
    cy.contains('#siteMenuDrawer .site-menu-nav a', t('website.partners.nav.listVenue')).should('have.attr', 'href', linkUrl('partnersApp', '/register-venue'));
    cy.contains('#siteMenuDrawer .site-menu-nav a', t('website.partners.nav.becomeHost')).should('have.attr', 'href', linkUrl('partnersApp', '/become-host'));
    cy.contains('#siteMenuDrawer .site-menu-actions a', t('website.partners.nav.join')).should('have.attr', 'href', linkUrl('partnersApp', '/register-venue'));
    cy.contains('#siteMenuDrawer .site-menu-actions a', t('website.partners.nav.login')).should('have.attr', 'href', linkUrl('partnersApp'));
  });
});
