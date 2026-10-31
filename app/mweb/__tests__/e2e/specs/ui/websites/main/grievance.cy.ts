/// <reference types="cypress" />
import { captchaCopy, grievanceEscalationCopy, grievanceTicketFieldCopy, type CaptchaCopy, type Translator } from '@duncit/i18n';
import { GRIEVANCE_OFFICER_SDL } from '@duncit/utils';
import {
  captchaToken,
  CENTER_SCROLL,
  expectNeverSent,
  guardMutation,
  interceptQuery,
  squish,
  visitSite,
  websiteCopy,
  WRONG_CAPTCHA,
} from '../../../../support/ui-websites';

/**
 * duncit.com/grievance (website/main-website/src/pages/grievance.astro +
 * @duncit/brand/widgets/grievance-form): the published Grievance Officer, the
 * escalation ladder and the signed-out form. No grievance is ever filed: the
 * missing ticket reference is stopped by the browser (submitGrievance refused
 * at the network as a guard) and a wrong captcha is refused before anything is
 * stored (grievance.resolver.ts requireHuman).
 */

interface Officer {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const FORM = 'form[data-cms-widget="grievance-form"]';

function fillGrievance(): void {
  cy.get(`${FORM} input[name="support_ticket_ref"]`).type('TKT-E2E-0001');
  cy.get(`${FORM} input[name="name"]`).type('E2E Visitor');
  cy.get(`${FORM} input[name="email"]`).type('e2e-grievance@example.com');
  cy.get(`${FORM} input[name="phone"]`).type('+919876543210');
  cy.get(`${FORM} input[name="subject"]`).type('E2E check');
  cy.get(`${FORM} textarea[name="description"]`).type('An end-to-end check of the grievance form.');
}

describe('UI duncit.com · Grievance', CENTER_SCROLL, () => {
  let t: Translator['t'];
  let captcha: CaptchaCopy;
  let officer: Officer | null;

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
      captcha = captchaCopy(copy);
    });
    cy.gql<{ grievanceOfficer: Officer | null }>(GRIEVANCE_OFFICER_SDL, {}, { token: null }).then((data) => {
      officer = data.grievanceOfficer?.name ? data.grievanceOfficer : null;
    });
  });

  it('GRV-01 the officer block lists each filled detail with its label, or says the details are coming', () => {
    visitSite('main', '/grievance');
    cy.contains('main section h2', t('grievance.officerTitle')).parent().as('officer');
    if (!officer) {
      cy.get('@officer').should('contain.text', t('grievance.officerEmpty')).find('dl').should('not.exist');
      return;
    }
    const rows = [
      [t('grievance.officerName'), officer.name],
      [t('grievance.officerEmail'), officer.email],
      [t('grievance.officerPhone'), officer.phone],
      [t('grievance.officerAddress'), officer.address],
    ].filter(([, value]) => value);
    cy.get('@officer').find('dt').should('have.length', rows.length);
    rows.forEach(([label, value], index) => {
      cy.get('@officer').find('dt').eq(index).should('readText', label);
      cy.get('@officer').find('dd').eq(index).should('readText', value);
    });
  });

  it('GRV-02 the escalation ladder shows its three steps and the warning above the form', () => {
    const ladder = grievanceEscalationCopy(t);
    visitSite('main', '/grievance');
    cy.get('[data-grievance-ladder] h2').should('readText', ladder.title);
    cy.get('[data-grievance-ladder] ol > li').should('have.length', ladder.steps.length);
    ladder.steps.forEach((step, index) => {
      cy.get('[data-grievance-ladder] ol > li').eq(index).invoke('text').then((text) => {
        expect(squish(text)).to.contain(step.title).and.contain(step.body);
      });
    });
    cy.get('[data-grievance-ladder] [role="note"]').should('readText', ladder.warning);
    cy.get(`${FORM} input[name="support_ticket_ref"]`).should('have.attr', 'placeholder', grievanceTicketFieldCopy(t).refPlaceholder);
  });

  it('GRV-03 an empty support ticket reference is stopped by the browser and nothing is filed', () => {
    guardMutation('submitGrievance', 'grievance');
    visitSite('main', '/grievance');
    fillGrievance();
    cy.get(`${FORM} input[name="support_ticket_ref"]`).clear();
    captchaToken(FORM);
    cy.get(`${FORM} input[name="captcha_answer"]`).type('ABCDE');
    cy.get(`${FORM} button`).last().click();
    cy.get(`${FORM} input[name="support_ticket_ref"]`).should(($input) => {
      expect(($input[0] as HTMLInputElement).validity.valueMissing).to.eq(true);
    });
    cy.get('[data-grievance-done]').should('have.class', 'hidden');
    expectNeverSent('grievance');
  });

  it('GRV-04 a wrong captcha answer gets the wrong-code message, the button comes back and no reference is shown', () => {
    visitSite('main', '/grievance');
    fillGrievance();
    captchaToken(FORM);
    cy.get(`${FORM} input[name="captcha_answer"]`).type(WRONG_CAPTCHA);
    interceptQuery('submitGrievance', 'grievance');
    cy.get(`${FORM} button`).last().click();
    cy.wait('@grievance').then(({ response }) => {
      expect(response?.body?.errors?.[0]?.extensions?.code).to.eq('CAPTCHA_WRONG');
      expect(response?.body?.data?.submitGrievance ?? null).to.eq(null);
    });
    cy.get(`${FORM} [data-captcha-error]`).should('readText', captcha.wrong);
    cy.get(`${FORM} button`).last().should('not.be.disabled').and('contain.text', t('grievance.submit'));
    cy.get(FORM).should('not.have.class', 'hidden');
    cy.get('[data-grievance-done]').should('have.class', 'hidden');
  });
});
