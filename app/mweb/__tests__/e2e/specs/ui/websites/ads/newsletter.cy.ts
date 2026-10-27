/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  captchaToken,
  expectNeverSent,
  expectNewTab,
  guardMutation,
  linkUrl,
  requirePolicies,
  siteBranding,
  siteNav,
  visitSite,
  websiteCopy,
  type SiteBranding,
  type SiteNavLink,
  type SitePolicy,
} from '../../../../support/ui-websites';

/**
 * The ads footer (website/ads-website/src/components/SiteFooter.astro): portal
 * ADS FOOTER groups plus the bundled groups whose label the portal does not
 * use, the policy strip pointing at duncit.com, and the consent newsletter card
 * (source ADS_WEBSITE_FOOTER). Nothing is subscribed — every submit here is one
 * the form must refuse, with subscribeNewsletter blocked as a guard.
 */

const CARD = 'footer [data-newsletter-root]';

describe('UI Ads website · Footer and newsletter', () => {
  let t: Translator['t'];
  let branding: SiteBranding;
  let policies: SitePolicy[];
  let portal: SiteNavLink[];

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
    siteNav('ADS', 'FOOTER').then((links) => {
      portal = links;
    });
  });

  it('FOOT-01 the bundled Advertise and Duncit groups render unless the portal names a group the same', () => {
    const portalLabels = new Set(portal.map((link) => (link.group_label || 'More').toLowerCase()));
    const advertise = t('website.ads.footer.advertiseGroup');
    const duncit = t('website.ads.footer.duncitGroup');
    visitSite('ads');
    if (!portalLabels.has(advertise.toLowerCase())) {
      cy.get(`footer nav[aria-label="${advertise}"] a[href="#calculator"]`).should('contain.text', t('website.ads.nav.pricing'));
      cy.contains(`footer nav[aria-label="${advertise}"] a`, t('website.ads.footer.adsConsole')).then(($a) => expectNewTab($a, linkUrl('adsPortal')));
    }
    if (!portalLabels.has(duncit.toLowerCase())) {
      cy.contains(`footer nav[aria-label="${duncit}"] a`, t('website.ads.footer.duncit')).then(($a) => expectNewTab($a, linkUrl('mainSite')));
      cy.contains(`footer nav[aria-label="${duncit}"] a`, t('website.ads.footer.support')).then(($a) => expectNewTab($a, linkUrl('mainSite', '/help')));
    }
    for (const link of portal) cy.get(`footer a[href="${link.url}"]`).should('contain.text', link.label);
    cy.get(`footer a[href="mailto:${branding.support_email}"]`).should('contain.text', branding.support_email);
  });

  it('FOOT-02 the footer Earn with Duncit link points at earnwith', () => {
    visitSite('ads');
    cy.contains('footer a', t('website.ads.footer.earnWithDuncit')).then(($a) => expectNewTab($a, linkUrl('earnwith')));
  });

  it('FOOT-03 the policy strip opens each duncit.com policy page in a new tab', () => {
    visitSite('ads');
    for (const policy of policies) {
      cy.contains('footer [data-cms-block="policy-strip"] a', policy.title).then(($a) =>
        expectNewTab($a, linkUrl('mainSite', `/policy/${encodeURIComponent(policy.slug)}`)),
      );
    }
    cy.get('footer [data-cms-block="policy-strip"] a.policy-strip-all').then(($a) => expectNewTab($a, linkUrl('mainSite', '/policies')));
  });

  it('FOOT-04 the newsletter card asks for consent, linking duncit.com/policies in a new tab', () => {
    visitSite('ads');
    cy.get(`${CARD} .newsletter-heading`).should('readText', t('website.ads.newsletter.heading'));
    cy.get(`${CARD} .newsletter-text`).should('readText', t('website.ads.newsletter.text'));
    cy.get(`${CARD} input[name="consent"]`).should('have.attr', 'required');
    cy.get(`${CARD} input[name="consent"]`).should('not.be.checked');
    cy.get(`${CARD} .newsletter-consent a`).then(($a) => expectNewTab($a, linkUrl('mainSite', '/policies')));
  });

  it('FOOT-05 an unticked consent stops the submit even with a valid address and code', () => {
    guardMutation('subscribeNewsletter', 'subscribe');
    visitSite('ads');
    cy.get(`${CARD} input[name="email"]`).type('e2e-ads-newsletter@example.com');
    captchaToken(CARD);
    cy.get(`${CARD} input[name="captcha_answer"]`).type('ABCDE');
    cy.get(`${CARD} button[type="submit"]`).click();
    cy.get(`${CARD} input[name="consent"]`).should(($box) => {
      expect(($box[0] as HTMLInputElement).validity.valueMissing, 'consent required').to.eq(true);
    });
    cy.get(`${CARD} [data-newsletter-status]`).should('readText', '');
    expectNeverSent('subscribe');
  });
});
