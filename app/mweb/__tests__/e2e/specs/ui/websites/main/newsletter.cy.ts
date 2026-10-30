/// <reference types="cypress" />
import { CAPTCHA_FALLBACK_COPY, type Translator } from '@duncit/i18n';
import {
  captchaToken,
  CENTER_SCROLL,
  expectNeverSent,
  guardMutation,
  interceptQuery,
  visitSite,
  websiteCopy,
  WRONG_CAPTCHA,
} from '../../../../support/ui-websites';

/**
 * The duncit.com footer newsletter card (@duncit/brand NewsletterSignup.astro,
 * variant "card", source WEBSITE_FOOTER) and its deferred captcha
 * (@duncit/captcha Captcha.astro). No scenario here subscribes a real address:
 * the server checks the captcha before anything else (captcha.guard.ts
 * requireHuman), so a wrong or forged code stores nothing and mails no one.
 * The footer passes no captcha copy, so the widget speaks CAPTCHA_FALLBACK_COPY.
 */

const ROOT = 'footer [data-newsletter-root]';
const ADDRESS = 'e2e-newsletter@example.com';

describe('UI duncit.com · Newsletter', CENTER_SCROLL, () => {
  let t: Translator['t'];

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
    });
  });

  it('NL-01 the row shows its heading, field and button, and the captcha waits for the first keystroke', () => {
    visitSite('main');
    cy.get(`${ROOT} .newsletter-heading`).should('readText', t('website.footer.newsletterTitle'));
    cy.get(`${ROOT} input[name="email"]`).should('have.attr', 'placeholder', t('website.footer.emailPlaceholder'));
    cy.get(`${ROOT} button[type="submit"]`).should('readText', t('website.footer.notify'));
    cy.get(`${ROOT} [data-captcha-root]`).should('not.be.visible');
    cy.get(`${ROOT} input[name="email"]`).type('e');
    cy.get(`${ROOT} [data-captcha-root]`).should('be.visible');
    cy.get(`${ROOT} [data-captcha-image]`).should('have.attr', 'src').and('match', /^data:image\//);
    cy.get(`${ROOT} input[name="captcha_answer"]`).should('have.attr', 'required');
    cy.get(`${ROOT} [data-captcha-refresh]`).should('have.attr', 'aria-label', CAPTCHA_FALLBACK_COPY.refresh);
  });

  it('NL-02 a malformed address is stopped by the browser and never sent', () => {
    guardMutation('subscribeNewsletter', 'subscribe');
    visitSite('main');
    cy.get(`${ROOT} input[name="email"]`).type('not-an-email');
    captchaToken(ROOT);
    cy.get(`${ROOT} input[name="captcha_answer"]`).type('ABCDE');
    cy.get(`${ROOT} button[type="submit"]`).click();
    cy.get(`${ROOT} input[name="email"]`).should(($input) => {
      const input = $input[0] as HTMLInputElement;
      expect(input.validity.typeMismatch, 'email type mismatch').to.eq(true);
      expect(input.validationMessage).not.to.eq('');
    });
    expectNeverSent('subscribe');
  });

  it('NL-03 a valid address with the captcha answer left empty is stopped on the answer field', () => {
    guardMutation('subscribeNewsletter', 'subscribe');
    visitSite('main');
    cy.get(`${ROOT} input[name="email"]`).type(ADDRESS);
    captchaToken(ROOT);
    cy.get(`${ROOT} button[type="submit"]`).click();
    cy.get(`${ROOT} input[name="captcha_answer"]`).should(($input) => {
      expect(($input[0] as HTMLInputElement).validity.valueMissing, 'answer missing').to.eq(true);
    });
    expectNeverSent('subscribe');
  });

  it('NL-04 a wrong code is answered by the captcha itself, with a new picture, and nothing is subscribed', () => {
    visitSite('main');
    cy.get(`${ROOT} input[name="email"]`).type(ADDRESS);
    captchaToken(ROOT).then((first) => {
      cy.get(`${ROOT} input[name="captcha_answer"]`).type(WRONG_CAPTCHA);
      interceptQuery('subscribeNewsletter', 'subscribe');
      cy.get(`${ROOT} button[type="submit"]`).click();
      cy.wait('@subscribe').then(({ response }) => {
        expect(response?.body?.errors?.[0]?.extensions?.code).to.eq('CAPTCHA_WRONG');
        expect(response?.body?.data?.subscribeNewsletter ?? null).to.eq(null);
      });
      cy.get(`${ROOT} [data-captcha-error]`).should('readText', CAPTCHA_FALLBACK_COPY.wrong);
      cy.get(`${ROOT} [data-newsletter-status]`).should('readText', '');
      cy.get(`${ROOT} input[name="captcha_answer"]`).should('have.value', '');
      cy.get(`${ROOT} [data-captcha-token]`).should(($input) => {
        expect(String($input.val())).not.to.eq('');
        expect(String($input.val())).not.to.eq(first);
      });
      cy.get(`${ROOT} button[type="submit"]`).should('not.be.disabled');
    });
  });

  it('NL-05 a code the server cannot read is answered as expired and the widget reloads', () => {
    visitSite('main');
    cy.get(`${ROOT} input[name="email"]`).type(ADDRESS);
    captchaToken(ROOT);
    cy.get(`${ROOT} [data-captcha-token]`).invoke('val', 'e2e-not-a-captcha-token');
    cy.get(`${ROOT} input[name="captcha_answer"]`).type('ABCDE');
    interceptQuery('subscribeNewsletter', 'subscribe');
    cy.get(`${ROOT} button[type="submit"]`).click();
    cy.wait('@subscribe').its('response.body.errors.0.extensions.code').should('eq', 'CAPTCHA_INVALID');
    cy.get(`${ROOT} [data-captcha-error]`).should('readText', CAPTCHA_FALLBACK_COPY.expired);
    cy.get(`${ROOT} [data-captcha-token]`).should(($input) => {
      expect(String($input.val())).not.to.be.oneOf(['', 'e2e-not-a-captcha-token']);
    });
  });
});
