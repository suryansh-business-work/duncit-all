/// <reference types="cypress" />
import { CAPTCHA_FALLBACK_COPY, type Translator } from '@duncit/i18n';
import {
  captchaToken,
  expectNewTab,
  interceptQuery,
  linkUrl,
  requirePolicies,
  siteBranding,
  siteNav,
  visitSite,
  websiteCopy,
  WRONG_CAPTCHA,
  type SiteBranding,
  type SiteNavLink,
  type SitePolicy,
} from '../../../../support/ui-websites';

/**
 * The partners footer (website/partners-website/src/components/SiteFooter.astro):
 * blurb, branding support email, PARTNERS FOOTER navigation (or its fallback),
 * the policy strip to duncit.com and the newsletter card with no consent box
 * (source WEBSITE_FOOTER). Nothing is subscribed: the one submit sends
 * a code that cannot match, which the server refuses before storing anything.
 */

const CARD = 'footer [data-newsletter-root]';

describe('UI Partners website · Footer and newsletter', () => {
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
    siteNav('PARTNERS', 'FOOTER').then((links) => {
      portal = links;
    });
  });

  it('PFOOT-01 the footer shows its blurb, the support email and its navigation', () => {
    visitSite('partners');
    cy.get('footer').should('contain.text', t('website.partners.footer.blurb'));
    cy.get(`footer a[href="mailto:${branding.support_email}"]`).should('readText', branding.support_email);
    if (portal.length) {
      for (const link of portal) cy.get(`footer nav a[href="${link.url}"]`).should('readText', link.label);
    } else {
      cy.get(`footer nav a[href="${linkUrl('mainSite')}"]`).should('readText', t('website.partners.footer.mainSite'));
      cy.get(`footer nav a[href="${linkUrl('mainSite', '/help')}"]`).should('readText', t('website.partners.footer.support'));
    }
  });

  it('PFOOT-02 the policy strip opens each duncit.com policy page in a new tab', () => {
    visitSite('partners');
    cy.get('footer [data-cms-block="policy-strip"] h3').should('readText', t('website.partners.footer.policyHub'));
    for (const policy of policies) {
      cy.contains('footer [data-cms-block="policy-strip"] a', policy.title).then(($a) =>
        expectNewTab($a, linkUrl('mainSite', `/policy/${encodeURIComponent(policy.slug)}`)),
      );
    }
  });

  it('PFOOT-03 the newsletter card has no consent box, and a wrong code is refused by the captcha with nothing stored', () => {
    visitSite('partners');
    cy.get(`${CARD} .newsletter-heading`).should('readText', t('website.partners.footer.newsletterHeading'));
    cy.get(`${CARD} input[name="consent"]`).should('not.exist');
    cy.get(`${CARD} input[name="email"]`).type('e2e-partners-newsletter@example.com');
    captchaToken(CARD);
    cy.get(`${CARD} input[name="captcha_answer"]`).type(WRONG_CAPTCHA);
    interceptQuery('subscribeNewsletter', 'subscribe');
    cy.get(`${CARD} button[type="submit"]`).click();
    cy.wait('@subscribe').then(({ request, response }) => {
      expect(request.body.variables.input.source).to.eq('WEBSITE_FOOTER');
      expect(response?.body?.errors?.[0]?.extensions?.code).to.eq('CAPTCHA_WRONG');
    });
    cy.get(`${CARD} [data-captcha-error]`).should('readText', CAPTCHA_FALLBACK_COPY.wrong);
  });
});
