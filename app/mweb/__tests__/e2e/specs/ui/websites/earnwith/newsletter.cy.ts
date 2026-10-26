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
  squish,
  visitSite,
  websiteCopy,
  type SiteBranding,
  type SiteNavLink,
  type SitePolicy,
} from '../../../../support/ui-websites';

/**
 * The earnwith footer (website/earnwith-website/src/components/SiteFooter.astro):
 * the four bundled link groups (kept unless the portal's EARNWITH FOOTER groups
 * use the same label), the policy strip to duncit.com and the consent newsletter
 * card (source WEBSITE_FOOTER). Nothing is subscribed: the consent box must stop
 * the submit, and subscribeNewsletter is refused at the network as a guard.
 */

const CARD = 'footer [data-newsletter-root]';

describe('UI Earn With website · Footer and newsletter', () => {
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
    siteNav('EARNWITH', 'FOOTER').then((links) => {
      portal = links;
    });
  });

  it('EFOOT-01 the bundled groups list every earn, survey, help and company link the site promises', () => {
    const groups: { label: string; links: { key: string; href: string }[] }[] = [
      {
        label: t('website.earn.footer.groupProduct'),
        links: [
          { key: 'earnWithUs', href: '#paths' },
          { key: 'howItWorks', href: '#how' },
          { key: 'earningsEstimator', href: '#calculator' },
          { key: 'resources', href: linkUrl('mainSite', '/safety/resources') },
          { key: 'blog', href: linkUrl('mainSite', '/blog') },
        ],
      },
      {
        label: t('website.earn.footer.groupCommunity'),
        links: [
          { key: 'forHosts', href: linkUrl('mweb', '/survey/host') },
          { key: 'forVenues', href: linkUrl('mweb', '/survey/venue') },
          { key: 'forClubs', href: linkUrl('mweb', '/survey/club_admin') },
          { key: 'forBrands', href: linkUrl('mweb', '/survey/ecomm') },
          { key: 'community', href: linkUrl('mainSite', '/community') },
        ],
      },
      {
        label: t('website.earn.footer.groupSupport'),
        links: [
          { key: 'helpCenter', href: linkUrl('mainSite', '/help') },
          { key: 'contactUs', href: linkUrl('mainSite', '/contact') },
          { key: 'faq', href: linkUrl('mainSite', '/faq') },
          { key: 'safety', href: linkUrl('mainSite', '/safety/approach') },
          { key: 'guidelines', href: linkUrl('mainSite', '/guidelines') },
        ],
      },
      {
        label: t('website.earn.footer.groupCompany'),
        links: [
          { key: 'aboutUs', href: linkUrl('mainSite', '/about') },
          { key: 'careers', href: linkUrl('mainSite', '/careers') },
          { key: 'newsroom', href: linkUrl('mainSite', '/newsroom') },
          { key: 'login', href: linkUrl('mweb', '/login') },
          { key: 'signup', href: linkUrl('mweb', '/register') },
        ],
      },
    ];
    const portalLabels = new Set(portal.map((link) => (link.group_label || 'More').toLowerCase()));
    visitSite('earnwith');
    for (const group of groups.filter((g) => !portalLabels.has(g.label.toLowerCase()))) {
      for (const link of group.links) {
        cy.get(`footer nav[aria-label="${group.label}"] a[href="${link.href}"]`).then(($a) => {
          expect(squish($a.text())).to.contain(t(`website.earn.footer.${link.key}`));
          if (link.href.startsWith('#')) expect($a).not.to.have.attr('target');
          else expectNewTab($a, link.href);
        });
      }
    }
    for (const link of portal) cy.get(`footer a[href="${link.url}"]`).should('contain.text', link.label);
    cy.get(`footer a[href="mailto:${branding.support_email}"]`).should('exist');
  });

  it('EFOOT-02 the policy strip opens each duncit.com policy in a new tab', () => {
    visitSite('earnwith');
    for (const policy of policies) {
      cy.contains('footer [data-cms-block="policy-strip"] a', policy.title).then(($a) =>
        expectNewTab($a, linkUrl('mainSite', `/policy/${encodeURIComponent(policy.slug)}`)),
      );
    }
  });

  it('EFOOT-03 the newsletter card shows heading, text, field, button and a consent box linking duncit.com/policies', () => {
    visitSite('earnwith');
    cy.get(`${CARD} .newsletter-heading`).should('readText', t('website.earn.newsletter.heading'));
    cy.get(`${CARD} .newsletter-text`).should('readText', t('website.earn.newsletter.text'));
    cy.get(`${CARD} input[name="email"]`).should('have.attr', 'placeholder', t('website.earn.newsletter.placeholder'));
    cy.get(`${CARD} button[type="submit"]`).should('readText', t('website.earn.newsletter.button'));
    cy.get(`${CARD} input[name="consent"]`).should('not.be.checked');
    cy.get(`${CARD} .newsletter-consent a`).should('readText', t('website.earn.newsletter.consentLinkLabel')).then(($a) =>
      expectNewTab($a, linkUrl('mainSite', '/policies')),
    );
  });

  it('EFOOT-04 an unticked consent stops the submit even with a valid address and code', () => {
    guardMutation('subscribeNewsletter', 'subscribe');
    visitSite('earnwith');
    cy.get(`${CARD} input[name="email"]`).type('e2e-earnwith-newsletter@example.com');
    captchaToken(CARD);
    cy.get(`${CARD} input[name="captcha_answer"]`).type('ABCDE');
    cy.get(`${CARD} button[type="submit"]`).click();
    cy.get(`${CARD} input[name="consent"]`).should(($box) => {
      expect(($box[0] as HTMLInputElement).validity.valueMissing, 'consent required').to.eq(true);
    });
    expectNeverSent('subscribe');
  });
});
