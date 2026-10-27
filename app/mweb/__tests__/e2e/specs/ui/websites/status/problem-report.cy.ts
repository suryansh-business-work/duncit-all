/// <reference types="cypress" />
import { captchaCopy, type CaptchaCopy, type Translator } from '@duncit/i18n';
import { expectNeverSent, guardMutation, interceptQuery, statusCopy, visitSite, WRONG_CAPTCHA } from '../../../../support/ui-websites';

/**
 * "Report a problem" on the status page (website/status-website/src/forms/
 * report-issue: React Hook Form + Zod, screenshots, the MUI captcha). No report
 * is ever filed: validation stops the client-side cases with
 * submitStatusReport refused at the network as a guard, the one round trip
 * carries a code that cannot match (statusReport.resolver.ts checks it first),
 * and the transport failure never leaves the browser.
 */

/** A 1×1 transparent PNG. */
const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const png = (fileName: string) => ({ contents: Cypress.Buffer.from(TINY_PNG, 'base64'), fileName, mimeType: 'image/png' });

describe('UI Status website · Problem report', () => {
  let t: Translator['t'];
  let captcha: CaptchaCopy;

  before(() => {
    statusCopy().then((copy) => {
      t = copy;
      captcha = captchaCopy(copy);
    });
  });

  /** The MUI input a visible label names. */
  const field = (label: string) =>
    cy.contains('form label', label).invoke('attr', 'for').then((id) => cy.get(`[id="${id}"]`));
  const helper = (label: string) =>
    cy.contains('form label', label).invoke('attr', 'for').then((id) => cy.get(`[id="${id}-helper-text"]`));

  const openForm = () => {
    visitSite('status');
    cy.contains('button', t('status.report.open')).click();
    cy.get('form').should('be.visible');
  };

  const fillValid = () => {
    field(t('status.report.name')).type('E2E Visitor');
    field(t('status.report.email')).type('e2e-status@example.com');
    field(t('status.report.pageUrl')).type('https://staging.duncit.com/');
    field(t('status.report.message')).type('An end-to-end check of the report form.');
  };

  it('REP-01 the button opens the form with service, impact, contact, page, message, screenshots and the captcha', () => {
    openForm();
    for (const key of ['service', 'impact', 'name', 'email', 'pageUrl', 'message']) cy.contains('form label', t(`status.report.${key}`)).should('exist');
    cy.get('form').should('contain.text', t('status.report.screenshots')).and('contain.text', captcha.title);
    cy.get(`form img[alt="${captcha.imageAlt}"]`).should('have.attr', 'src').and('match', /^data:image\//);
  });

  it('REP-02 touched fields explain what is wrong before any request', () => {
    guardMutation('submitStatusReport', 'report');
    openForm();
    field(t('status.report.name')).focus().blur();
    helper(t('status.report.name')).should('readText', t('status.report.nameRequired'));
    field(t('status.report.email')).type('abc').blur();
    helper(t('status.report.email')).should('readText', t('status.report.emailInvalid'));
    field(t('status.report.email')).clear().blur();
    helper(t('status.report.email')).should('readText', t('status.report.emailRequired'));
    field(t('status.report.pageUrl')).type('ftp://x').blur();
    helper(t('status.report.pageUrl')).should('readText', t('status.report.urlInvalid'));
    field(t('status.report.message')).type('short').blur();
    helper(t('status.report.message')).should('readText', t('status.report.messageShort'));
    expectNeverSent('report');
  });

  it('REP-03 a valid report with the captcha answer empty is stopped on the captcha field', () => {
    guardMutation('submitStatusReport', 'report');
    openForm();
    fillValid();
    cy.contains('form button[type="submit"]', t('status.report.submit')).click();
    helper(captcha.label).should('readText', captcha.required);
    expectNeverSent('report');
  });

  it('REP-04 an image over 5 MB is refused with no preview', () => {
    openForm();
    cy.get('form input[type="file"]').selectFile(
      { contents: Cypress.Buffer.alloc(6 * 1024 * 1024), fileName: 'too-big.png', mimeType: 'image/png' },
      { force: true },
    );
    cy.get('form').should('contain.text', t('status.report.screenshotTooLarge'));
    cy.get('form img[alt="too-big.png"]').should('not.exist');
  });

  it('REP-05 three images fill the slots, a fourth is refused, and removing one frees the button again', () => {
    openForm();
    cy.get('form input[type="file"]').selectFile([png('one.png'), png('two.png'), png('three.png'), png('four.png')], { force: true });
    cy.get('form').should('contain.text', t('status.report.screenshotLimit'));
    cy.get('form img[alt$=".png"]').should('have.length', 3);
    cy.contains('form button', t('status.report.addScreenshot')).should('be.disabled');
    cy.get(`form button[aria-label="${t('status.report.removeScreenshot')}"]`).first().click();
    cy.get('form img[alt$=".png"]').should('have.length', 2);
    cy.contains('form button', t('status.report.addScreenshot')).should('not.be.disabled');
  });

  it('REP-06 a wrong captcha answer is refused by the server, explained on the captcha field and cleared', () => {
    openForm();
    fillValid();
    field(captcha.label).type(WRONG_CAPTCHA);
    interceptQuery('submitStatusReport', 'report');
    cy.contains('form button[type="submit"]', t('status.report.submit')).click();
    cy.wait('@report').then(({ response }) => {
      expect(response?.body?.errors?.[0]?.extensions?.code).to.eq('CAPTCHA_WRONG');
      expect(response?.body?.data?.submitStatusReport ?? null).to.eq(null);
    });
    helper(captcha.label).should('readText', captcha.wrong);
    field(captcha.label).should('have.value', '');
    cy.get('form').should('be.visible');
  });

  it('REP-07 a report that cannot reach the server shows the failure alert and keeps the form', () => {
    guardMutation('submitStatusReport', 'report');
    openForm();
    fillValid();
    field(captcha.label).type('ABCDE');
    cy.contains('form button[type="submit"]', t('status.report.submit')).click();
    cy.get('form [role="alert"]').should('readText', t('status.report.failure'));
  });

  it('REP-08 Cancel collapses the form without sending', () => {
    guardMutation('submitStatusReport', 'report');
    openForm();
    field(t('status.report.name')).type('E2E Visitor');
    cy.contains('form button', t('status.report.cancel')).click();
    cy.get('form').should('not.exist');
    cy.contains('button', t('status.report.open')).should('be.visible');
    expectNeverSent('report');
  });
});
