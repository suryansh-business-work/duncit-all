/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import { storeCopy, storeSettings, useStoreDesktop, visitSite } from '../../../../support/ui-websites';

/**
 * The pet store contact page's support ticket form (src/pages/info/
 * support-ticket-form, React Hook Form + Zod). No ticket is raised: every case
 * here is one the schema must refuse, and EcommStoreCreateSupportTicket is
 * refused at the network as a guard should validation ever let one through.
 */

const FORM = '[data-testid="support-ticket-form"]';
const helperOf = (testId: string) => cy.get(`${FORM} [data-testid="${testId}"] [id$="-helper-text"]`);
const inputOf = (testId: string) => cy.get(`${FORM} [data-testid="${testId}"] input, ${FORM} [data-testid="${testId}"] textarea:not([aria-hidden])`).first();

describe('UI Pet store · Support', () => {
  let t: Translator['t'];

  before(() => {
    storeCopy().then((copy) => {
      t = copy;
    });
    storeSettings();
  });

  beforeEach(() => {
    useStoreDesktop();
    cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
      if ((req.body as { operationName?: string })?.operationName === 'EcommStoreCreateSupportTicket') {
        req.alias = 'ticket';
        req.reply({ forceNetworkError: true });
      }
    });
  });

  const expectNoTicket = () => {
    cy.get('@ticket.all').should('have.length', 0);
  };

  it('SUP-01 sending the empty form names every required field and raises nothing', () => {
    visitSite('ecomm', '/contact');
    cy.get('[data-testid="contact-raise-ticket"]').should('be.visible');
    cy.get('[data-testid="support-ticket-send"]').click();
    helperOf('support-ticket-name').should('readText', t('ecommStore.validation.nameRequired'));
    helperOf('support-ticket-email').should('readText', t('ecommStore.validation.emailRequired'));
    helperOf('support-ticket-subject').should('readText', t('ecommStore.contact.subjectRequired'));
    helperOf('support-ticket-message').should('readText', t('ecommStore.contact.messageRequired'));
    cy.get('[data-testid="support-ticket-sent"]').should('not.exist');
    expectNoTicket();
  });

  it('SUP-02 a malformed email and phone are refused with their own messages', () => {
    visitSite('ecomm', '/contact');
    inputOf('support-ticket-name').type('E2E Shopper');
    inputOf('support-ticket-email').type('not-an-email');
    inputOf('support-ticket-phone').type('12345');
    inputOf('support-ticket-subject').type('E2E check');
    inputOf('support-ticket-message').type('An end-to-end check of the store contact form.');
    cy.get('[data-testid="support-ticket-send"]').click();
    helperOf('support-ticket-email').should('readText', t('ecommStore.validation.emailInvalid'));
    helperOf('support-ticket-phone').should('readText', t('ecommStore.validation.phoneInvalid'));
    expectNoTicket();
  });
});
