import type { RunAccount } from '../../support/run-account';
import { staffAccount } from '../../support/ui-staff';

/**
 * Support › Access and dashboard: the Support Dashboard at `/` — five queue
 * counters, each a way into its list. The counts are read from the same
 * queries the page sends, so the assertion is "the card shows what the server
 * answered", whatever staging holds. The live socket update is not under test
 * here (the suite stubs the socket).
 */

interface TicketPage {
  tickets: { total: number };
}

interface FaqSubmissions {
  faqSubmissions: unknown[];
}

describe('Support · Access and dashboard (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, account.password('CHANGED'));
  });

  it('SAD-01 the five counters show the open queues, and Open tickets opens Tickets', () => {
    cy.interceptOperation('Tickets');
    cy.visitPortal('support', '/');
    cy.byTestId('page-header-title').should('have.text', 'Support Dashboard');
    cy.byTestId('support-stat-sos').should('contain.text', 'Active SOS alerts');
    cy.byTestId('support-stat-callbacks').should('contain.text', 'Pending callbacks');
    cy.byTestId('support-stat-live-chat').should('contain.text', 'Open chats');
    cy.wait('@Tickets').then(({ request, response }) => {
      expect(request.body.variables.status, 'the card counts open tickets').to.equal('OPEN');
      const { total } = (response?.body.data as TicketPage).tickets;
      cy.byTestId('support-stat-tickets').should('contain.text', 'Open tickets').and('contain.text', String(total));
    });
    cy.byTestId('support-stat-tickets').click();
    cy.location('pathname').should('eq', '/tickets');
    cy.byTestId('page-header-title').should('have.text', 'Tickets');
  });

  it('SAD-02 New FAQ submissions counts the NEW queue and opens FAQ Submissions', () => {
    cy.interceptOperation('SupportFaqSubmissions');
    cy.visitPortal('support', '/');
    cy.wait('@SupportFaqSubmissions').then(({ request, response }) => {
      expect(request.body.variables.status).to.equal('NEW');
      const count = (response?.body.data as FaqSubmissions).faqSubmissions.length;
      cy.byTestId('support-stat-faqs-submissions')
        .should('contain.text', 'New FAQ submissions')
        .and('contain.text', String(count));
    });
    cy.byTestId('support-stat-faqs-submissions').click();
    cy.location('pathname').should('eq', '/faqs/submissions');
  });
});
