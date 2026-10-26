import type { RunAccount } from '../../support/run-account';
import { searchTable } from '../../support/tables';
import { countOperation, expectNotSent, expectTableEmpty, specMarker, staffAccount } from '../../support/ui-staff';

/**
 * Pods Portal › Attendance (/event-tickets): the Check-in by QR card and the
 * tickets table. Checking a ticket in marks a real attendee present — and what
 * a host is paid is counted from it — so no real ticket is checked in here.
 * The card is proven on what it must refuse: nothing to verify while the token
 * is empty, and a tampered token never unlocks Check in.
 */

const TICKETS = 'EventTicketsTable';

describe('Pods Portal · Attendance (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = staffAccount();
    marker = specMarker(account, 'pods-tickets');
  });

  beforeEach(() => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
  });

  it('ATT-01 Verify and Check in stay off with no token, and a tampered token is refused without unlocking Check in', () => {
    cy.interceptOperation(TICKETS);
    cy.visitPortal('pods', '/event-tickets');
    cy.wait(`@${TICKETS}`).its('response.body.errors').should('be.undefined');
    cy.byTestId('event-tickets-title').should('have.text', 'Event Tickets');
    cy.byTestId('event-tickets-verify').should('be.disabled');
    cy.byTestId('event-tickets-check-in').should('be.disabled');

    const checkIns = countOperation('CheckInEventTicket');
    cy.byTestId('event-tickets-token').type(`tampered.${marker.replaceAll(/\W+/g, '')}.token`, { delay: 0 });
    cy.byTestId('event-tickets-verify').should('be.enabled');
    cy.interceptOperation('VerifyEventTicketQr');
    cy.byTestId('event-tickets-verify').click();
    cy.wait('@VerifyEventTicketQr');
    cy.byTestId('event-tickets-verify-error').should('be.visible');
    cy.byTestId('event-tickets-verify-ok').should('not.exist');
    cy.byTestId('event-tickets-check-in').should('be.disabled');
    expectNotSent(checkIns, 'CheckInEventTicket');
  });

  it('ATT-02 a search no ticket matches leaves the table reading "No tickets yet."', () => {
    cy.interceptOperation(TICKETS);
    cy.visitPortal('pods', '/event-tickets');
    cy.wait(`@${TICKETS}`);
    searchTable(TICKETS, `${marker} no ticket has this code`);
    expectTableEmpty('No tickets yet.');
  });
});
