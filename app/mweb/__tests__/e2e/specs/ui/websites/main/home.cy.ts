/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  emulateReducedMotion,
  expectInViewport,
  expectNewTab,
  expectSiteMeta,
  fetchHtml,
  linkUrl,
  siteBranding,
  siteNav,
  siteUrl,
  visitSite,
  websiteCopy,
  type SiteBranding,
} from '../../../../support/ui-websites';

/**
 * duncit.com home (website/main-website/src/pages/index.astro): the hero reel and
 * its two account CTAs into mWeb, the download band (@duncit/brand AppDownload),
 * the Duncit network cards, the earn showcase, and the slide-out menu with the
 * persisted theme toggle (SiteNav.astro + @duncit/brand/widgets/site-nav).
 */
describe('UI duncit.com · Home', () => {
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

  it('HOME-01 the head carries the home title, description, canonical and social card', () => {
    fetchHtml(siteUrl('main', '/')).then(({ status, doc }) => {
      expect(status).to.eq(200);
      expectSiteMeta(doc, {
        title: t('website.main.home.title'),
        siteName: branding.app_name,
        canonical: linkUrl('mainSite', '/'),
        description: t('website.main.layout.siteDescription'),
      });
    });
  });

  it('HOME-02 Join and Sign in hand the visitor to mWeb register and login; the Get app chip scrolls to #download', () => {
    visitSite('main');
    cy.get('h1').first().should('contain.text', t('website.main.home.headingLine1'));
    cy.get(`a[href="${linkUrl('mweb', '/register')}"]`).should('contain.text', t('website.main.home.join'));
    cy.get(`a[href="${linkUrl('mweb', '/login')}"]`).should('contain.text', t('website.main.home.signIn'));
    cy.get('section nav a[href="#download"]').should('contain.text', t('website.main.home.getApp')).click();
    cy.location('hash').should('eq', '#download');
    cy.get('#download').should(expectInViewport);
  });

  it('HOME-03 the scroll cue under the CTAs also scrolls to the download band', () => {
    visitSite('main');
    cy.contains('a[href="#download"]', t('website.main.home.scroll')).click();
    cy.get('#download').should(expectInViewport);
  });

  describe('reduced motion', () => {
    afterEach(() => {
      emulateReducedMotion(false);
    });

    it('HOME-04 a visitor who asked for less motion gets the paused poster frame, not the reel', () => {
      emulateReducedMotion(true);
      visitSite('main');
      cy.get('video#heroReel')
        .should('not.have.attr', 'autoplay')
        .and('have.attr', 'poster', '/media/duncit-reel-poster.jpg')
        .should(($video) => expect(($video[0] as HTMLVideoElement).paused, 'reel paused').to.eq(true));
    });
  });

  it('HOME-05 without that preference the muted reel plays once the visitor touches the page', () => {
    visitSite('main');
    cy.get('video#heroReel').should('have.attr', 'autoplay');
    cy.document().trigger('keydown', { key: 'Shift' });
    cy.get('video#heroReel', { timeout: 30000 }).should(($video) => {
      const video = $video[0] as HTMLVideoElement;
      expect(video.muted, 'muted').to.eq(true);
      expect(video.paused, 'playing').to.eq(false);
    });
  });

  it('HOME-06 the download band shows each store from branding: a live new-tab link, or a coming-soon tile with no link', () => {
    visitSite('main');
    const stores = [
      { name: t('website.main.download.googlePlayName'), url: branding.android_app_url },
      { name: t('website.main.download.appStoreName'), url: branding.ios_app_url },
    ];
    cy.get('[data-cms-block="app-download"] .app-store').should('have.length', 2);
    for (const store of stores) {
      cy.contains('[data-cms-block="app-download"] .app-store', store.name).then(($tile) => {
        if (store.url) {
          expect($tile[0].tagName, `${store.name} is a link`).to.eq('A');
          expectNewTab($tile, store.url);
          expect($tile.find('.app-store-soon')).to.have.length(0);
        } else {
          expect($tile[0].tagName, `${store.name} has no link`).to.eq('SPAN');
          expect($tile.find('.app-store-soon')).to.have.length(1);
        }
      });
    }
  });

  it('HOME-07 the Duncit network cards open earnwith, ads and partners in a new tab and say so to a screen reader', () => {
    visitSite('main');
    const cards = [
      { title: t('website.main.network.earnTitle'), href: linkUrl('earnwith') },
      { title: t('website.main.network.adsTitle'), href: linkUrl('adsSite') },
      { title: t('website.main.network.partnersTitle'), href: linkUrl('partnersSite') },
    ];
    cy.get('#network h2').should('readText', t('website.main.network.heading'));
    cy.get('#network a').should('have.length', cards.length);
    for (const card of cards) {
      cy.contains('#network a', card.title).then(($card) => {
        expectNewTab($card, card.href);
        expect($card.find('.sr-only').text()).to.eq(`${card.title} — opens in a new tab`);
      });
    }
  });

  it('HOME-08 the earn showcase renders its copy and its one CTA points at earnwith', () => {
    visitSite('main');
    cy.get('[data-earn-showcase] h2').should('contain.text', t('website.brand.earnShowcase.heading'));
    cy.get('[data-earn-showcase] a.earn-cta')
      .should('have.attr', 'href', linkUrl('earnwith'))
      .and('contain.text', t('website.brand.earnShowcase.cta'));
  });

  it('HOME-09 the burger opens the menu with its groups and the Policy Hub; close and Escape shut it', () => {
    siteNav('MAIN', 'HEADER').then((links) => {
      const groups = links.length
        ? [...new Set(links.map((link) => link.group_label || 'More'))]
        : [t('website.main.nav.about'), t('website.main.nav.community'), t('website.main.nav.safetyHub'), t('website.main.nav.support')];
      visitSite('main');
      cy.get('#siteNav').should('have.attr', 'aria-hidden', 'true');
      cy.get('[data-nav-toggle]').first().click();
      cy.get('#siteNav').should('have.attr', 'aria-hidden', 'false');
      for (const group of [...groups, t('website.footer.policyHub')]) cy.get('#siteNav h4').should('contain.text', group);
      cy.get('#siteNav a[href="/policies"]').should('contain.text', t('website.footer.allPolicies'));
      cy.get('#siteNav [data-nav-close]').click();
      cy.get('#siteNav').should('have.attr', 'aria-hidden', 'true');
      cy.get('[data-nav-toggle]').first().click();
      cy.get('#siteNav').should('have.attr', 'aria-hidden', 'false');
      cy.get('body').type('{esc}');
      cy.get('#siteNav').should('have.attr', 'aria-hidden', 'true');
    });
  });

  it('HOME-10 the theme toggle in the menu switches to dark, remembers it, and the reload paints dark first', () => {
    visitSite('main');
    cy.get('html').should('have.attr', 'data-theme', 'light');
    cy.get('[data-nav-toggle]').first().click();
    cy.get('#siteNav [data-theme-toggle]').should('have.attr', 'aria-pressed', 'false').click();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('#siteNav [data-theme-toggle]').should('have.attr', 'aria-pressed', 'true');
    cy.get('#siteNav [data-theme-icon]').should('have.class', 'fa-sun');
    cy.window().its('localStorage').invoke('getItem', 'duncit-theme').should('eq', 'dark');
    cy.reload();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
  });
});
