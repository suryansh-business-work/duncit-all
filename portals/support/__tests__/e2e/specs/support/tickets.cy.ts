import type { RunAccount } from '../../support/run-account';
import { openTable } from '../../support/tables';
import {
  downloaded,
  expectConfirm,
  pickOption,
  selectShows,
  specMarker,
  staffAccount,
} from '../../support/ui-staff';

/**
 * Support › Tickets: raising, answering, prioritising, resolving, closing,
 * re-opening and exporting a ticket — on tickets the run account raises itself.
 *
 * A ticket raised from the portal belongs to the signed-in agent, which here is
 * the run account: every email a status change sends (resolved, reply, the
 * transcript) goes to the run's own mailbox, and the member's feedback is given
 * by that same account. `after()` closes whatever the spec left open, so the
 * marked tickets never sit in Support's queue.
 */

const CREATE_TICKET_API = `mutation E2eCreateTicket($input: CreateTicketInput!) {
  createTicket(input: $input) { id ticket_no subject status priority }
}`;

const MY_TICKETS = `query E2eMarkedTickets($search: String) {
  tickets(search: $search, page: 1, page_size: 25) { items { id subject status } }
}`;

const CLOSE_TICKET = `mutation E2eCloseTicket($ticket_id: ID!) {
  updateTicketStatus(ticket_id: $ticket_id, status: CLOSED) { id }
}`;

const SUBMIT_FEEDBACK = `mutation E2eSubmitTicketFeedback($ticket_id: ID!, $rating: Int!, $comment: String) {
  submitTicketFeedback(ticket_id: $ticket_id, rating: $rating, comment: $comment) { id rating }
}`;

interface Ticket {
  id: string;
  ticket_no: string;
  subject: string;
  status: string;
  priority: string;
}

const raiseTicket = (subject: string) =>
  cy
    .gql<{ createTicket: Ticket }>(CREATE_TICKET_API, {
      input: {
        subject,
        category: 'GENERAL',
        body_html: '<p>Raised by the staff portals suite.</p>',
        body_text: 'Raised by the staff portals suite.',
        attachments: [],
      },
    })
    .then((data) => data.createTicket);

/** The ticket page, with the ticket loaded. */
function openTicket(ticket: Ticket): void {
  cy.interceptOperation('Ticket');
  cy.visitPortal('support', `/tickets/${ticket.id}`);
  cy.wait('@Ticket');
  cy.byTestId('back-header-title').should('have.text', ticket.subject);
}

describe('Support · Tickets (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = staffAccount();
    marker = specMarker(account, 'support-tickets');
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, account.password('CHANGED'));
  });

  after(() => {
    if (!marker) return;
    cy.apiPortalLogin('support', account.email, account.password('CHANGED'));
    cy.gql<{ tickets: { items: { id: string; subject: string; status: string }[] } }>(MY_TICKETS, {
      search: marker,
    }).then((data) => {
      for (const ticket of data.tickets.items.filter((t) => t.subject.includes(marker) && t.status !== 'CLOSED')) {
        cy.gql(CLOSE_TICKET, { ticket_id: ticket.id });
      }
    });
  });

  it('ST-01 New Ticket needs a subject and a description, then opens the ticket — OPEN, MEDIUM, raised by the agent', () => {
    const subject = `${marker} raised from the portal`;
    openTable('support', '/tickets', 'Tickets');
    cy.byTestId('ticket-new').click();
    cy.byTestId('ticket-new-dialog').should('contain.text', 'New Ticket');
    cy.byTestId('ticket-new-create').should('be.disabled');
    cy.byTestId('ticket-new-subject').type(subject, { delay: 0 });
    // A subject alone is not a ticket: the description is still blank.
    cy.byTestId('ticket-new-create').should('be.disabled');
    cy.byTestId('ticket-new-dialog').within(() => cy.byTestId('rich-text-editor').type('What the member needs.'));

    cy.interceptOperation('CreateTicket');
    cy.interceptOperation('Ticket');
    cy.byTestId('ticket-new-create').should('be.enabled').click();
    cy.wait('@CreateTicket').then(({ response }) => {
      const id = response?.body.data.createTicket.id as string;
      cy.location('pathname').should('eq', `/tickets/${id}`);
    });
    cy.wait('@Ticket').its('response.body.data.ticket').then((ticket: Ticket & { user: { email: string } }) => {
      expect(ticket.status).to.equal('OPEN');
      expect(ticket.priority).to.equal('MEDIUM');
      expect(ticket.user.email, 'raised under the signed-in agent').to.equal(account.email);
    });
    cy.byTestId('back-header-title').should('have.text', subject);
    selectShows('ticket-status', 'OPEN');
    selectShows('ticket-priority', 'MEDIUM');
  });

  it('ST-02 a reply lands in the thread and moves the ticket to PENDING; priority persists; Mark resolved shows the member feedback', () => {
    const reply = `${marker} agent reply`;
    raiseTicket(`${marker} to answer`).then((ticket) => {
      openTicket(ticket);
      cy.byTestId('ticket-send').should('be.disabled');
      cy.byTestId('rich-text-editor').type(reply);
      cy.interceptOperation('ReplyToTicket');
      cy.byTestId('ticket-send').should('be.enabled').click();
      cy.wait('@ReplyToTicket').its('response.body.errors').should('be.undefined');
      cy.byTestId('ticket-scroll').should('contain.text', reply);
      selectShows('ticket-status', 'PENDING');

      cy.interceptOperation('UpdateTicketPriority');
      pickOption('ticket-priority', 'ticket-priority-option-HIGH');
      cy.wait('@UpdateTicketPriority').its('response.body.errors').should('be.undefined');
      openTicket(ticket);
      selectShows('ticket-priority', 'HIGH');

      cy.byTestId('ticket-resolve').click();
      expectConfirm('Mark this ticket resolved?');
      cy.interceptOperation('ResolveTicket');
      cy.byTestId('confirm-dialog-confirm').should('have.text', 'Mark resolved').click();
      cy.wait('@ResolveTicket').its('response.body.errors').should('be.undefined');
      selectShows('ticket-status', 'RESOLVED');
      cy.byTestId('ticket-resolved-notice').should('contain.text', 'This ticket is resolved.');
      cy.byTestId('ticket-send').should('not.exist');
      cy.byTestId('ticket-reopen').should('exist');

      // The member (the same run account) rates the resolved ticket.
      cy.gql(SUBMIT_FEEDBACK, { ticket_id: ticket.id, rating: 5, comment: `Thanks ${marker}` });
      openTicket(ticket);
      cy.byTestId('feedback-panel')
        .should('contain.text', 'User feedback')
        .and('contain.text', '5 · Very Satisfied')
        .and('contain.text', `“Thanks ${marker}”`);
    });
  });

  it('ST-03 Close makes a resolved ticket read-only, and Re-open brings the composer back', () => {
    raiseTicket(`${marker} to close`).then((ticket) => {
      openTicket(ticket);
      cy.byTestId('ticket-resolve').click();
      cy.interceptOperation('ResolveTicket');
      cy.byTestId('confirm-dialog-confirm').click();
      cy.wait('@ResolveTicket');

      cy.byTestId('ticket-close').should('have.text', 'Close').click();
      expectConfirm('Close this support ticket?');
      cy.interceptOperation('UpdateTicketStatus');
      cy.byTestId('confirm-dialog-confirm').should('have.text', 'Close ticket').click();
      cy.wait('@UpdateTicketStatus').its('request.body.variables.status').should('eq', 'CLOSED');
      cy.byTestId('ticket-closed-notice').should(
        'have.text',
        'This ticket is closed and read-only. The user can reopen it within the allowed window.',
      );
      cy.byTestId('ticket-close').should('not.exist');
      cy.byTestId('ticket-send').should('not.exist');

      cy.interceptOperation('ReopenTicket');
      cy.byTestId('ticket-reopen').click();
      cy.wait('@ReopenTicket').its('response.body.errors').should('be.undefined');
      selectShows('ticket-status', 'OPEN');
      cy.byTestId('ticket-closed-notice').should('not.exist');
      cy.byTestId('ticket-send').should('exist');
    });
  });

  it('ST-04 the transcript downloads as .txt, and Email transcript needs an address then confirms the send', () => {
    raiseTicket(`${marker} to export`).then((ticket) => {
      openTicket(ticket);
      cy.interceptOperation('TicketTranscript');
      cy.byTestId('transcript-menu-open').click();
      cy.byTestId('transcript-download-txt').click();
      cy.wait('@TicketTranscript')
        .its('response.body.data.ticketTranscript.filename')
        .then((fileName: string) => {
          cy.readFile(downloaded(fileName)).should('contain', ticket.subject);
        });

      cy.byTestId('transcript-menu-open').click();
      cy.byTestId('transcript-email-open').click();
      cy.byTestId('transcript-email-dialog').should('be.visible');
      cy.byTestId('transcript-email-send').should('be.disabled');
      cy.byTestId('transcript-email-input').type(account.email, { delay: 0 });
      cy.interceptOperation('EmailTicketTranscript');
      cy.byTestId('transcript-email-send').should('be.enabled').click();
      cy.wait('@EmailTicketTranscript').its('response.body.errors').should('be.undefined');
      cy.byTestId('ticket-notice').should('contain.text', `Transcript emailed to ${account.email}.`);
    });
  });
});
