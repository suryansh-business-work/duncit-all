/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Support tickets — a member reads only their own. Scenario map: Apps ›
 * Support tickets ("A member cannot open another member's ticket or chat").
 *
 * The ticket-access check answers "Ticket not found" both for an id that does
 * not exist and for someone else's ticket (support/ticket.resolver.ts
 * `requireTicketAccess`), so asserting it on an id no ticket has is the
 * existence-leak check too. The member's own ticket, filed by 06, is the
 * positive control: the same call has to succeed for its owner.
 */

const TICKET_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Ticket not found' };

const MY_TICKETS = `query E2eMyTicketsForIsolation { myTickets { id subject } }`;
const TRANSCRIPT = `query E2eTicketTranscript($id: ID!) { ticketTranscript(ticket_id: $id) { text } }`;
const MARK_READ = `mutation E2eMarkTicketRead($id: ID!) { markTicketRead(ticket_id: $id) { __typename } }`;
const TICKET = `query E2eTicketById($id: ID!) { ticket(id: $id) { id } }`;
const MY_PAYMENT = `query E2eMyPaymentById($id: ID!) { myPayment(payment_doc_id: $id) { __typename } }`;

describe('API · Support tickets are readable by their owner only', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it("TI-01 the member's own ticket transcript opens for its owner", () => {
    cy.gql<{ myTickets: Array<{ id: string; subject: string }> }>(MY_TICKETS, {}, { token: memberToken }).then(
      ({ myTickets }) => {
        expect(myTickets, 'the ticket 06 filed').to.have.length.greaterThan(0);
        const [own] = myTickets;
        cy.gql<{ ticketTranscript: { text: string } }>(TRANSCRIPT, { id: own.id }, { token: memberToken }).then(
          ({ ticketTranscript }) => {
            expect(ticketTranscript.text).to.contain(own.subject);
          },
        );
      },
    );
  });

  it('TI-02 a ticket that is not the member’s answers "Ticket not found", and nothing to a signed-out caller', () => {
    cy.gqlRaw(TRANSCRIPT, { id: NO_ID }, { token: null }).then((body) =>
      expectRefused('ticketTranscript', body, SIGNED_OUT),
    );
    cy.gqlRaw(TRANSCRIPT, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('ticketTranscript', body, TICKET_NOT_FOUND),
    );
  });

  it('TI-03 a member cannot mark a ticket that is not theirs as read', () => {
    cy.gqlRaw(MARK_READ, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('markTicketRead', body, TICKET_NOT_FOUND),
    );
  });

  it('TI-04 reading a ticket or payment by an id that is not the member’s returns nothing', () => {
    cy.gql<{ ticket: unknown }>(TICKET, { id: NO_ID }, { token: memberToken }).then(({ ticket }) => {
      expect(ticket).to.be.null;
    });
    cy.gql<{ myPayment: unknown }>(MY_PAYMENT, { id: NO_ID }, { token: memberToken }).then(({ myPayment }) => {
      expect(myPayment).to.be.null;
    });
  });
});
