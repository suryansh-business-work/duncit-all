/// <reference types="cypress" />
import { marked, signInRunPartner, visitAndWait } from '../../support/ui-partners-3';

/**
 * FAQs, live (scenario map › Partners › FAQs).
 *
 * /faqs (the Help hub's FAQs tab, src/pages/PartnerFaqsPage.tsx) lists the
 * active partner FAQs from `publicPartnerFaqs(topic)`. A topic chip asks the
 * server again with that topic; the search box filters what was answered, on
 * the page, over question and answer. Every expectation is the server's own
 * answer to the same query. Read-only.
 */

const PARTNER_FAQS = `query E2eUiP3Faqs($topic: PartnerFaqTopic) {
  publicPartnerFaqs(topic: $topic) { id partner_topic question answer }
}`;

interface Faq {
  id: string;
  partner_topic: string | null;
  question: string;
  answer: string;
}

/** The topic chips in the order the page draws them, with the labels the partners bundle ships. */
const TOPICS = [
  { value: 'VENUE', label: 'Venue' },
  { value: 'HOST', label: 'Host' },
  { value: 'PRODUCTS', label: 'Products' },
] as const;

const faqsFor = (topic: string | null): Cypress.Chainable<Faq[]> =>
  cy.gql<{ publicPartnerFaqs: Faq[] }>(PARTNER_FAQS, { topic }, { token: null }).then((data) => data.publicPartnerFaqs);

/** Exactly `faqs` are listed, in the server's order. */
function expectListed(faqs: readonly Faq[]): void {
  cy.get('[data-testid^="partner-faq-"][data-testid$="-question"]').should('have.length', faqs.length);
  faqs.forEach((faq) => cy.byTestId(`partner-faq-${faq.id}-question`).should('contain.text', faq.question));
}

describe('Partners · FAQs', () => {
  let all: Faq[] = [];

  before(() => {
    faqsFor(null).then((rows) => {
      all = rows;
      if (rows.length === 0) throw new Error('Staging prerequisite: no active partner FAQ (Support portal › FAQs).');
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('FQ-01 lists every active partner FAQ, and opening one shows its answer with its line breaks kept', () => {
    visitAndWait('/faqs', 'PartnerFaqs');
    expectListed(all);
    const [first] = all;
    cy.byTestId(`partner-faq-${first.id}-question`).click();
    cy.byTestId(`partner-faq-${first.id}-answer`)
      .should('be.visible')
      .and('have.css', 'white-space', 'pre-line')
      .invoke('text')
      .should('eq', first.answer);
  });

  it('FQ-02 each topic chip asks the server for that topic and lists what it answers', () => {
    visitAndWait('/faqs', 'PartnerFaqs');
    TOPICS.forEach((topic) => {
      faqsFor(topic.value).then((rows) => {
        cy.interceptOperation('PartnerFaqs');
        cy.byTestId('partner-faqs-topic').contains(topic.label).click();
        cy.wait('@PartnerFaqs').its('request.body.variables.topic').should('eq', topic.value);
        cy.byTestId('partner-faqs-topic').contains(topic.label).closest('[aria-pressed]').should('have.attr', 'aria-pressed', 'true');
        if (rows.length === 0) {
          cy.byTestId('partner-faqs-empty').should('have.text', 'No FAQs found for this filter.');
        } else {
          expectListed(rows);
        }
      });
    });
  });

  it('FQ-03 search keeps only the FAQs whose question or answer holds the words, and clearing it brings all back', () => {
    visitAndWait('/faqs', 'PartnerFaqs');
    const words = all[0].question.trim().split(/\s+/).slice(0, 3).join(' ');
    const needle = words.toLowerCase();
    const matching = all.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(needle));
    cy.byTestId('partner-faqs-search').find('input').type(words);
    expectListed(matching);
    cy.byTestId('partner-faqs-search').find('input').clear().type(marked('faq search'));
    cy.byTestId('partner-faqs-empty').should('have.text', 'No FAQs found for this filter.');
    cy.byTestId('partner-faqs-search').find('input').clear();
    expectListed(all);
  });
});
