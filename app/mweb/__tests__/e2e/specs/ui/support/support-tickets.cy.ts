/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { signInRunMember } from '../../../support/access-steps';
import { runAccount } from '../../../support/run-account';
import { openSupportTile } from '../../../support/support-steps';

/**
 * Support - tickets, live on staging, on the tickets the run account filed in
 * 06. Nothing here changes a ticket's state — the staff-portal specs follow
 * those tickets by the run marker afterwards — so the scenarios read, filter,
 * download, and try a refused email; a ticket is opened pre-filled from a pod
 * booking but not sent.
 */

const MY_TICKETS_QUERY = `query E2eMyTickets { myTickets { id subject status } }`;
const MEMBERSHIPS_QUERY = `query E2eMyMemberships { myPodMemberships { id status pod { id pod_title } } }`;

type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
interface MyTicket {
  id: string;
  subject: string;
  status: TicketStatus;
}
interface Membership {
  id: string;
  status: string;
  pod: { id: string; pod_title: string } | null;
}

/** An id no ticket has — the page must not tell a missing ticket from someone else's. */
const UNKNOWN_TICKET_ID = 'ffffffffffffffffffffffff';

const myTickets = () => cy.gql<{ myTickets: MyTicket[] }>(MY_TICKETS_QUERY).then((data) => data.myTickets);

describe('UI Support - tickets', () => {
  const marker = runMarker(runAccount().stamp, 'mweb');
  let tickets: MyTicket[] = [];
  let runTicket: MyTicket;

  before(() => {
    signInRunMember();
    myTickets().then((rows) => {
      tickets = rows;
      const filed = rows.find((row) => row.subject.startsWith(marker));
      if (!filed) throw new Error(`The run account has no ticket titled "${marker} …" — 06 files it.`);
      runTicket = filed;
    });
  });

  it('ST-01 Your tickets counts each status, and the Resolved tab keeps its place across a reload', () => {
    const count = (status: TicketStatus) => tickets.filter((row) => row.status === status).length;
    const resolved = tickets.filter((row) => row.status === 'RESOLVED');
    cy.interceptOperation('MyTickets');
    openSupportTile('tickets');
    cy.wait('@MyTickets');
    cy.byTestId('my-tickets-header-title').should('have.text', 'Your tickets');
    cy.byTestId('tickets-filter-ALL').should('have.text', `All (${tickets.length})`).and('have.attr', 'aria-selected', 'true');
    cy.byTestId('tickets-filter-OPEN').should('have.text', `Open (${count('OPEN')})`);
    cy.byTestId('tickets-filter-RESOLVED').should('have.text', `Resolved (${resolved.length})`).click();
    cy.location('search').should('contain', 'selectedtab=RESOLVED');
    cy.byTestId('tickets-filter-RESOLVED').should('have.attr', 'aria-selected', 'true');
    if (resolved.length === 0) {
      cy.byTestId('my-tickets-empty').should('have.text', 'No resolved tickets.');
    } else {
      cy.byTestIdPrefix('my-ticket-').should('have.length', resolved.length);
    }
    cy.byTestId(`my-ticket-${runTicket.id}`).should(runTicket.status === 'RESOLVED' ? 'exist' : 'not.exist');
    cy.location().then((loc) => {
      cy.visitApp(`${loc.pathname}${loc.search}`);
    });
    cy.byTestId('tickets-filter-RESOLVED').should('have.attr', 'aria-selected', 'true');
    cy.byTestId('tickets-filter-ALL').click();
    cy.byTestId(`my-ticket-${runTicket.id}`).should('contain.text', runTicket.subject);
  });

  it('ST-02 a ticket id that is not yours is not shown', () => {
    cy.interceptOperation('MyTicket');
    cy.visitApp(`/tickets/${UNKNOWN_TICKET_ID}`);
    cy.wait('@MyTicket');
    cy.byTestId('ticket-details-missing').should('have.text', 'This ticket could not be found.');
    cy.byTestId('ticket-details-page').should('not.exist');
  });

  it('ST-03 the ticket menu downloads a .txt transcript, and an invalid address is refused for the emailed one', () => {
    cy.interceptOperation('MyTicket');
    cy.visitApp(`/tickets/${runTicket.id}`);
    cy.wait('@MyTicket');
    cy.byTestId('ticket-header-subject').should('have.text', runTicket.subject);
    cy.byTestId('ticket-header-menu-button').click();
    cy.interceptOperation('MyTicketTranscript');
    cy.byTestId('ticket-action-download').click();
    cy.wait('@MyTicketTranscript')
      .its('response.body.data.ticketTranscript')
      .should((transcript: { filename: string; content_base64: string }) => {
        expect(transcript.filename, 'a text transcript').to.match(/\.txt$/);
        expect(transcript.content_base64, 'with content').to.have.length.greaterThan(0);
      });
    cy.byTestId('ticket-header-menu-button').click();
    cy.byTestId('ticket-action-email').click();
    cy.byTestId('support-email-modal').should('be.visible');
    cy.byTestId('email-input').type('not-an-email');
    cy.interceptOperation('EmailMyTicketTranscript');
    cy.byTestId('email-send').should('have.text', 'Send').click();
    cy.wait('@EmailMyTicketTranscript');
    cy.byTestId('email-error').should('contain.text', 'A valid email is required');
    cy.byTestId('email-done').should('not.exist');
    cy.byTestId('email-close').should('have.text', 'Cancel').click();
    cy.byTestId('support-email-modal').should('not.exist');
  });

  it('ST-04 Contact support on a pod booking opens the ticket form about that pod, pre-filled', () => {
    cy.gql<{ myPodMemberships: Membership[] }>(MEMBERSHIPS_QUERY).then((data) => {
      const booking = data.myPodMemberships.find((row) => row.status === 'JOINED' && row.pod);
      if (!booking?.pod) throw new Error('The run account has no JOINED pod booking — 06 joins a free pod.');
      const title = booking.pod.pod_title;
      cy.interceptOperation('MyPodMembershipsForHistory');
      cy.visitApp(`/pod-history/${booking.id}`);
      cy.wait('@MyPodMembershipsForHistory');
      cy.byTestId('ph-support').click();
      cy.location('pathname').should('eq', '/support/tickets');
      cy.location('search').should('contain', `podId=${booking.pod.id}`);
      cy.byTestId('ticket-attached-pod').should('have.text', `About pod: ${title}`);
      cy.byTestId('field-subject').should('have.value', `Support - ${title}`);
      cy.byTestId('field-message').invoke('val').should('contain', `Pod: ${title}. Membership: ${booking.id}.`);
    });
  });
});
