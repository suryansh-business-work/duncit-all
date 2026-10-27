/// <reference types="cypress" />
import { createTranslator, type Translator } from '@duncit/i18n';
import { visitSite, websiteCopy, WEBSITE_FALLBACK_FLAT, type SiteKey } from '../../../../support/ui-websites';

/**
 * The tracking-consent banner every website mounts (@duncit/brand/consent-banner.ts:
 * ConsentBanner.astro on the Astro sites, main.tsx on status and the pet store).
 * Nothing optional is on before an answer, Reject all is as prominent as Accept
 * all, the answer lands in the duncit_consent cookie (host-only on localhost,
 * consent.ts consentCookieDomain), and the footer's Privacy choices reopens it.
 * The React sites render the banner with the bundled copy (siteT).
 */

const BANNER = 'section.duncit-consent';

interface StoredChoice {
  analytics: boolean;
  marketing: boolean;
}

const readChoice = (): Cypress.Chainable<StoredChoice | null> =>
  cy
    .getCookie('duncit_consent')
    .then((cookie) =>
      cy.wrap<StoredChoice | null>(cookie ? (JSON.parse(decodeURIComponent(cookie.value)) as StoredChoice) : null, { log: false }),
    );

describe('UI Websites · GDPR consent', () => {
  let t: Translator['t'];
  const bundled = createTranslator({ locale: 'en-IN', fallback: WEBSITE_FALLBACK_FLAT }).t;

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
    });
  });

  it('GDPR-01 a first visit to duncit.com shows the banner with Accept all and Reject all equally prominent and nothing ticked', () => {
    visitSite('main', '/', { consent: 'none' });
    cy.get(BANNER).should('be.visible');
    cy.get(`${BANNER} h2`).should('readText', t('privacy.banner.title'));
    cy.contains(`${BANNER} button`, t('privacy.banner.acceptAll')).should('have.class', 'dc-primary');
    cy.contains(`${BANNER} button`, t('privacy.banner.rejectAll')).should('have.class', 'dc-primary');
    cy.contains(`${BANNER} button`, t('privacy.banner.customise')).should('have.attr', 'aria-expanded', 'false').click();
    cy.get(`${BANNER} fieldset`).should('be.visible');
    cy.get(`${BANNER} input[name="analytics"]`).should('not.be.checked');
    cy.get(`${BANNER} input[name="marketing"]`).should('not.be.checked');
    cy.get(`${BANNER} input[type="checkbox"]:disabled`).should('be.checked');
    cy.get(`${BANNER} a`).should('have.attr', 'href', '/policies');
    readChoice().should('eq', null);
  });

  it('GDPR-02 Reject all stores a no to both, closes the banner and never asks for the analytics tag', () => {
    cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
      if (String((req.body as { query?: string })?.query ?? '').includes('googleAnalyticsTag')) req.alias = 'gaTag';
    });
    visitSite('main', '/', { consent: 'none' });
    cy.contains(`${BANNER} button`, t('privacy.banner.rejectAll')).click();
    cy.get(BANNER).should('not.be.visible');
    readChoice().should('deep.include', { analytics: false, marketing: false });
    cy.reload();
    cy.get(BANNER).should('not.be.visible');
    cy.get('@gaTag.all').should('have.length', 0);
    cy.get('script[src*="googletagmanager.com/gtag/js"]').should('not.exist');
  });

  it('GDPR-03 Privacy choices in the footer reopens the banner with the saved answer, and a custom save keeps only what was ticked', () => {
    visitSite('main', '/', { consent: 'reject' });
    cy.get(BANNER).should('not.be.visible');
    cy.get('footer [data-consent-open]').click();
    cy.get(BANNER).should('be.visible');
    cy.contains(`${BANNER} button`, t('privacy.banner.customise')).click();
    cy.get(`${BANNER} input[name="analytics"]`).should('not.be.checked').check();
    cy.contains(`${BANNER} button`, t('privacy.banner.save')).click();
    cy.get(BANNER).should('not.be.visible');
    readChoice().should('deep.include', { analytics: true, marketing: false });
  });

  const reactSites: { site: SiteKey; path: string }[] = [
    { site: 'status', path: '/' },
    { site: 'ecomm', path: '/' },
  ];
  for (const { site, path } of reactSites) {
    it(`GDPR-04 the ${site} site asks too, and Accept all stores a yes to both`, () => {
      visitSite(site, path, { consent: 'none' });
      cy.get(BANNER).should('be.visible');
      cy.get(`${BANNER} h2`).should('readText', bundled('privacy.banner.title'));
      cy.contains(`${BANNER} button`, bundled('privacy.banner.acceptAll')).click();
      cy.get(BANNER).should('not.be.visible');
      readChoice().should('deep.include', { analytics: true, marketing: true });
    });
  }
});
