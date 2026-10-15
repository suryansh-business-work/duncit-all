/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  expectInViewport,
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
 * partners.duncit.com landing (website/partners-website/src/pages/index.astro +
 * components/SiteHeader.astro): the venue and host CTAs into the Partners app,
 * the header brand mark and Log in, the proof stats, and the #ways / #download
 * anchors. Partner Brand (partners-app.duncit.com/ecomm-brand) is a separate
 * product and is not touched here.
 */
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

  it('PART-02 the hero offers the venue and host CTAs into the Partners app, beside the three proof stats', () => {
    visitSite('partners');
    cy.get('h1').should('readText', t('website.partners.hero.heading'));
    cy.contains('[data-hero-copy] a', t('website.partners.hero.venueCta')).should('have.attr', 'href', linkUrl('partnersApp', '/register-venue'));
    cy.contains('[data-hero-copy] a', t('website.partners.hero.hostCta')).should('have.attr', 'href', linkUrl('partnersApp', '/become-host'));
    const stats = [
      { value: '24h', label: t('website.partners.ways.statReview') },
      { value: '0', label: t('website.partners.ways.statFee') },
      { value: '2', label: t('website.partners.ways.statPaths') },
    ];
    for (const stat of stats) cy.contains('[data-hero-card] div', stat.label).parent().should('contain.text', stat.value);
  });

  it('PART-03 the brand mark goes to duncit.com and Log in to the Partners app', () => {
    visitSite('partners');
    cy.get('header a.partner-brand').should('have.attr', 'href', linkUrl('mainSite')).and('have.attr', 'aria-label', t('website.partners.nav.brandAria'));
    cy.get('header a.partner-login').should('have.attr', 'href', linkUrl('partnersApp'));
  });

  it('PART-04 How it works scrolls to the three ways to partner, and Get the app to #download', () => {
    useDesktop();
    visitSite('partners');
    cy.contains('header a.partner-link', t('website.partners.nav.how')).should('have.attr', 'href', '#ways').click();
    cy.get('#ways').should(expectInViewport);
    cy.get('#ways article').should('have.length', 3);
    for (const key of ['venueTitle', 'hostTitle', 'earningsTitle']) cy.get('#ways h3').should('contain.text', t(`website.partners.ways.${key}`));
    cy.contains('header a.partner-link', t('website.partners.nav.getApp')).should('have.attr', 'href', '#download').click();
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
