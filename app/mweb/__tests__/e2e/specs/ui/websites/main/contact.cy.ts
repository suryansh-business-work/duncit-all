/// <reference types="cypress" />
import { captchaCopy, type CaptchaCopy, type Translator } from '@duncit/i18n';
import {
  blockQuery,
  captchaToken,
  CENTER_SCROLL,
  expectNeverSent,
  guardMutation,
  interceptQuery,
  siteBranding,
  visitSite,
  websiteCopy,
  WRONG_CAPTCHA,
  type SiteBranding,
} from '../../../../support/ui-websites';

/**
 * duncit.com/contact (website/main-website/src/pages/contact.astro +
 * @duncit/brand/widgets/contact-form): the reach-us cards from branding and the
 * message form with its captcha. No message is ever delivered — the server
 * checks the captcha first (contact.resolver.ts requireHuman), so a wrong code
 * stores nothing, and the network-failure case never leaves the browser.
 */

const FORM = 'form[data-cms-widget="contact-form"]';

function fillMessage(): void {
  cy.get(`${FORM} input[name="name"]`).type('E2E Visitor');
  cy.get(`${FORM} input[name="email"]`).type('e2e-contact@example.com');
  cy.get(`${FORM} input[name="subject"]`).type('E2E check');
  cy.get(`${FORM} textarea[name="message"]`).type('An end-to-end check of the contact form.');
}

describe('UI duncit.com · Contact', CENTER_SCROLL, () => {
  let t: Translator['t'];
  let captcha: CaptchaCopy;
  let branding: SiteBranding;

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
      captcha = captchaCopy(copy);
    });
    siteBranding().then((found) => {
      branding = found;
    });
  });

  it('CON-01 the reach-us cards mail support, and call it or point at the Help Center', () => {
    visitSite('main', '/contact');
    cy.get(`a[href="mailto:${branding.support_email}"]`)
      .should('contain.text', t('website.main.contact.emailUs'))
      .and('contain.text', branding.support_email);
    if (branding.support_phone) {
      cy.get(`a[href="tel:${branding.support_phone}"]`).should('contain.text', t('website.main.contact.callUs'));
    } else {
      cy.get('main a[href="/help"]').should('contain.text', t('website.main.contact.helpCenter'));
    }
  });

  it('CON-02 Send with the required fields empty is stopped on the first of them', () => {
    guardMutation('submitContactForm', 'contact');
    visitSite('main', '/contact');
    cy.get(`${FORM} button`).last().click();
    cy.get(`${FORM} input[name="name"]`).should(($input) => {
      expect(($input[0] as HTMLInputElement).validity.valueMissing).to.eq(true);
    });
    expectNeverSent('contact');
  });

  it('CON-03 a wrong captcha answer is explained by the captcha, the form error stays hidden, and a new code loads', () => {
    visitSite('main', '/contact');
    fillMessage();
    captchaToken(FORM).then((first) => {
      cy.get(`${FORM} input[name="captcha_answer"]`).type(WRONG_CAPTCHA);
      interceptQuery('submitContactForm', 'contact');
      cy.get(`${FORM} button`).last().click();
      cy.wait('@contact').its('response.body.errors.0.extensions.code').should('eq', 'CAPTCHA_WRONG');
      cy.get(`${FORM} [data-captcha-error]`).should('readText', captcha.wrong);
      cy.get(`${FORM} [data-form-error]`).should('have.class', 'hidden');
      cy.get(`${FORM} [data-captcha-token]`).should(($input) => {
        expect(String($input.val())).not.to.be.oneOf(['', first]);
      });
    });
  });

  it('CON-04 the refresh button loads a new code, clears the answer and focuses it', () => {
    visitSite('main', '/contact');
    captchaToken(FORM).then((first) => {
      cy.get(`${FORM} input[name="captcha_answer"]`).type('ABCDE');
      cy.get(`${FORM} [data-captcha-refresh]`).should('have.attr', 'aria-label', captcha.refresh).click();
      cy.get(`${FORM} input[name="captcha_answer"]`).should('have.value', '').and('be.focused');
      cy.get(`${FORM} [data-captcha-token]`).should(($input) => {
        expect(String($input.val())).not.to.be.oneOf(['', first]);
      });
    });
  });

  it('CON-05 a captcha that cannot load says so', () => {
    blockQuery('captchaChallenge');
    visitSite('main', '/contact');
    cy.get(`${FORM} [data-captcha-error]`).should('readText', captcha.unavailable);
    cy.get(`${FORM} [data-captcha-token]`).should('have.value', '');
  });

  it('CON-06 a send that fails at the network shows the error line, reloads the captcha and restores the button', () => {
    visitSite('main', '/contact');
    fillMessage();
    captchaToken(FORM).then((first) => {
      cy.get(`${FORM} input[name="captcha_answer"]`).type('ABCDE');
      guardMutation('submitContactForm', 'contact');
      cy.get(`${FORM} button`).last().click();
      cy.get(`${FORM} [data-form-error]`).should('not.have.class', 'hidden').invoke('text').should('not.be.empty');
      cy.get(`${FORM} [data-captcha-token]`).should(($input) => {
        expect(String($input.val())).not.to.be.oneOf(['', first]);
      });
      cy.get(`${FORM} button`).last().should('contain.text', t('website.main.contact.send'));
    });
  });
});
