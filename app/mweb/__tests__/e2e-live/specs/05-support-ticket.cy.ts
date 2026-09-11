/// <reference types="cypress" />

import { identity, stamped } from '../support/identity';

/**
 * Support, against the real server: a ticket from the form to its thread to
 * its resolution, plus a callback request.
 *
 * A ticket has no delete mutation — not for the member, not for an agent —
 * so every subject here carries the run marker and the purge at the end of
 * the leg is what removes them.
 */

const subject = stamped('The page crashes when I tap save');
let ticketId = '';

/** `ST-` + the last six characters of the id, uppercased — how every list shows a ticket. */
const ticketNo = () => `ST-${ticketId.slice(-6).toUpperCase()}`;

describe('Support ticket', () => {
  const me = identity();

  beforeEach(() => {
    cy.blockThirdParty();
    cy.apiLogin(me.loginEmail, me.password);
  });

  it('the hub shows every way to reach support', () => {
    cy.visitApp('/support');
    cy.contains('Have a burning question?').should('be.visible');
    cy.contains('Start a conversation').should('be.visible');
    cy.contains('Create Support Tickets').should('be.visible');
    cy.contains('All Support Tickets').should('be.visible');
    cy.contains('Callback Request').should('be.visible');
    cy.contains('SOS').should('be.visible');
  });

  it('will not send a ticket without a subject and a message', () => {
    cy.visitApp('/support/tickets');
    cy.get('input[name="name"]').should('not.have.value', '');
    cy.get('input[name="email"]').should('have.value', me.loginEmail);
    // A floating overlay hovers above the submit on mobile viewports.
    cy.contains('button', 'Send to support').click({ force: true });
    cy.contains('Subject is required').should('be.visible');
    cy.contains('Message is required').should('be.visible');
  });

  it('refuses a subject and a message that are too short', () => {
    cy.visitApp('/support/tickets');
    cy.get('input[name="name"]').should('not.have.value', '');
    cy.get('input[name="subject"]').type('ab');
    cy.get('textarea[name="message"]').type('short');
    cy.contains('button', 'Send to support').click({ force: true });
    cy.contains('At least 3 characters').should('be.visible');
    cy.contains('Please describe in at least 10 characters').should('be.visible');
  });

  it('creates a ticket and opens it, open and numbered', () => {
    cy.visitApp('/support/tickets');
    cy.get('input[name="name"]').should('not.have.value', '');
    // Category is a TextField with `select`: its combobox carries the TextField's
    // own useId value, not the name-derived id selectOption looks for, and its
    // label has no `for`. The hidden native input is the one element that
    // carries the field name; the combobox is its sibling.
    cy.get('input[name="category"]').parent().find('[role="combobox"]').click();
    cy.get('[role="listbox"] [role="option"]').contains('Bug / Something is broken').click();
    cy.get('input[name="subject"]').type(subject);
    cy.get('textarea[name="message"]').type('Tapping Save on my profile shows a blank page and the change is lost.');
    cy.interceptOperation('CreateMyTicket');
    cy.contains('button', 'Send to support').click({ force: true });
    cy.wait('@CreateMyTicket');

    cy.location('pathname')
      .should('match', /^\/tickets\/[a-f0-9]{24}$/)
      .then((pathname) => {
        ticketId = pathname.split('/').at(-1) ?? '';
      });
    cy.contains('h6', subject).should('be.visible');
    cy.contains('.MuiChip-root', 'OPEN').should('be.visible');
    cy.contains('Tapping Save on my profile shows a blank page').should('be.visible');
  });

  it('lists the new ticket under Your tickets with its number', () => {
    cy.visitApp('/support/tickets');
    cy.contains('Your tickets').should('exist');
    cy.contains(ticketNo()).should('exist');
    cy.contains(subject).should('exist');
  });

  it('replies in the ticket thread', () => {
    const reply = 'It happens on WiFi as well as on mobile data.';
    cy.visitApp(`/tickets/${ticketId}`);
    cy.contains('h6', subject).should('be.visible');
    cy.get('textarea[placeholder^="Write a reply"]').type(reply);
    cy.interceptOperation('ReplyToMyTicket');
    cy.contains('button', 'Send').click();
    cy.wait('@ReplyToMyTicket');
    cy.contains(reply).should('be.visible');
  });

  it('shows the ticket in All Support Tickets as a support ticket', () => {
    cy.visitApp('/support/all');
    cy.contains(ticketNo()).should('be.visible');
    cy.contains(subject).should('be.visible');
    cy.contains('.MuiChip-root', 'Support Ticket').should('exist');
    cy.contains(subject).click();
    cy.location('pathname').should('eq', `/tickets/${ticketId}`);
  });

  it('marks the ticket resolved and rates the experience', () => {
    cy.visitApp(`/tickets/${ticketId}`);
    cy.get('[aria-label="Ticket options"]').click();
    cy.contains('li', 'Mark as resolved').click();
    cy.contains('[role="dialog"]', 'Mark as resolved?').within(() => {
      cy.contains('button', 'Yes, mark as resolved').click();
    });
    cy.contains('.MuiChip-root', 'RESOLVED').should('be.visible');

    // A resolved ticket asks how it went before anything else can be touched.
    // An emoji only picks the rating; Submit sends it, and the same dialog then
    // re-renders as the read-only summary with a Close button — nothing closes
    // it on its own.
    cy.interceptOperation('SubmitMyTicketFeedback');
    cy.contains('[role="dialog"]', 'How did we do?').within(() => {
      cy.get('button[aria-label^="5 "]').click();
      cy.contains('button', 'Submit').click();
    });
    cy.wait('@SubmitMyTicketFeedback');
    cy.contains('[role="dialog"]', 'How did we do?').within(() => {
      cy.contains('Your rating: 😍 Very Satisfied').should('be.visible');
      cy.contains('button', 'Close').click();
    });
    cy.contains('[role="dialog"]', 'How did we do?').should('not.exist');
    cy.contains('This conversation has been marked as resolved.').should('be.visible');
  });

  it('requests a callback without picking a pod', () => {
    const reason = stamped('Please call me about a refund');
    cy.visitApp('/support/callback');
    cy.contains('Callback Request').should('be.visible');
    cy.contains(/Select a pod|Choose a pod/i).should('not.exist');
    cy.fieldByLabel("What's it about? (optional)").type(reason);
    cy.interceptOperation('RequestBouncerCallback');
    cy.contains('button', 'Request callback').click();
    cy.wait('@RequestBouncerCallback');
    cy.contains('Callback requested. We will reach you shortly.').should('be.visible');
    cy.contains('Previous callbacks').should('be.visible');
    cy.contains(reason).should('be.visible');
    cy.contains('.MuiChip-root', 'PENDING').should('be.visible');
  });
});
