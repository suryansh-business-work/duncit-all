/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  requirePolicies,
  siteBranding,
  siteNav,
  squish,
  visitSite,
  websiteCopy,
  type SiteBranding,
  type SiteNavLink,
  type SitePolicy,
} from '../../../../support/ui-websites';

/**
 * duncit.com footer (website/main-website/src/components/Footer.astro): link
 * columns from the Website portal's MAIN FOOTER navigation (bundled fallback
 * when it has none), drawn through SmartLink — an absolute URL opens a new tab
 * with the external glyph, a site path stays an ordinary link — the Policy Hub
 * strip (@duncit/brand PolicyStrip) and the copyright line.
 */

interface FooterLink {
  label: string;
  url: string;
}

const EXTERNAL = /^https?:\/\//i;

describe('UI duncit.com · Navigation', () => {
  let t: Translator['t'];
  let branding: SiteBranding;
  let policies: SitePolicy[];
  let footer: FooterLink[];

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
    });
    siteBranding().then((found) => {
      branding = found;
    });
    requirePolicies().then((found) => {
      policies = found;
    });
    siteNav('MAIN', 'FOOTER').then((links: SiteNavLink[]) => {
      footer = links;
    });
  });

  /** The fallback columns Footer.astro renders when the portal has no MAIN FOOTER links. */
  const fallbackLinks = (): FooterLink[] => [
    { label: t('website.main.nav.aboutUs'), url: '/about' },
    { label: t('website.main.nav.newsroom'), url: '/newsroom' },
    { label: t('website.main.nav.careers'), url: '/careers' },
    { label: t('website.main.nav.contactUs'), url: '/contact' },
    { label: t('website.main.nav.guidelines'), url: '/guidelines' },
    { label: t('website.main.nav.blog'), url: '/blog' },
    { label: t('website.main.nav.ourApproach'), url: '/safety/approach' },
    { label: t('website.main.nav.helpCenter'), url: '/help' },
    { label: t('website.main.nav.faq'), url: '/faq' },
    { label: t('website.main.nav.emailSupport'), url: `mailto:${branding.support_email}` },
  ];

  it('NAV-01 every footer link points where the Navigation manager (or the fallback) says, and only absolute URLs leave in a new tab', () => {
    const links = footer.length ? footer : fallbackLinks();
    visitSite('main', '/faq');
    for (const link of links) {
      cy.get(`footer a[href="${link.url}"]`).should('exist').then(($links) => {
        const $link = $links.first();
        expect(squish($link.text())).to.contain(link.label);
        if (EXTERNAL.test(link.url)) {
          expect($link).to.have.attr('target', '_blank');
          expect($link.find('i.fa-arrow-up-right-from-square')).to.have.length(1);
        } else {
          expect($link).not.to.have.attr('target');
          expect($link.find('i.fa-arrow-up-right-from-square')).to.have.length(0);
        }
      });
    }
  });

  it('NAV-02 a site path in the footer opens in the same tab', () => {
    const local = (footer.length ? footer : fallbackLinks()).find((link) => link.url.startsWith('/'));
    if (!local) throw new Error('Staging prerequisite: the MAIN footer navigation has no same-site link to follow.');
    visitSite('main', '/faq');
    cy.get(`footer a[href="${local.url}"]`).first().click();
    cy.location('pathname').should('eq', local.url.split(/[?#]/)[0]);
  });

  it('NAV-03 the Policy Hub strip lists every active policy plus All policies and Privacy choices', () => {
    visitSite('main');
    cy.get('footer [data-cms-block="policy-strip"] h3').should('readText', t('website.footer.policyHub'));
    for (const policy of policies) {
      cy.get(`footer [data-cms-block="policy-strip"] a[href="/policy/${encodeURIComponent(policy.slug)}"]`)
        .should('readText', policy.title)
        .and('not.have.attr', 'target');
    }
    cy.get('footer [data-cms-block="policy-strip"] a[href="/policies"]').should('readText', t('website.footer.allPolicies'));
    cy.get('footer [data-consent-open]').should('readText', t('privacy.banner.label'));
  });

  it('NAV-04 a policy title in the strip opens /policy/<slug>, and All policies opens /policies', () => {
    const [policy] = policies;
    visitSite('main');
    cy.get(`footer [data-cms-block="policy-strip"] a[href="/policy/${encodeURIComponent(policy.slug)}"]`).click();
    cy.location('pathname').should('eq', `/policy/${policy.slug}`);
    cy.get('footer [data-cms-block="policy-strip"] a[href="/policies"]').click();
    cy.location('pathname').should('eq', '/policies');
  });

  it('NAV-05 the copyright line reads © <app name> <year> | All Rights Reserved', () => {
    visitSite('main');
    cy.contains('footer span', `© ${branding.app_name}`)
      .invoke('text')
      .then((text) => {
        expect(squish(text)).to.eq(`© ${branding.app_name} ${new Date().getFullYear()} | ${t('website.footer.rights')}`);
      });
  });
});
