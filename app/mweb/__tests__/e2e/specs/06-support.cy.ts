/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { fill, sendCode } from '../support/account-steps';
import { openFromMenu } from '../support/menu-steps';
import { runAccount } from '../support/run-account';
import { SIGNUP_NAME } from '../support/signup-steps';
import {
  faqGroupId,
  faqGroupNamed,
  filedTicket,
  firstFaq,
  joinFreePod,
  reportProblemForm,
} from '../support/support-data';
import {
  attachThroughPicker,
  loadPhoto,
  openSupportHub,
  openSupportTile,
  runPhoto,
  stubSosLocation,
} from '../support/support-steps';

/**
 * 06 — Help & Support, the member's side, live (stage CHANGED).
 *
 * Nine journeys, each entered the way a member enters it: Home › the header
 * avatar › the menu › FAQs or Help & Support. Everything filed here carries the
 * run marker — `[E2E <stamp> mweb]` — in its text, because the staff-portal
 * specs that run next follow each record into the Support and Legal portals by
 * it: the problem report, the ticket (which the grievance escalates), the
 * grievance, the callback, the SOS (left ACTIVE for Support to acknowledge) and
 * the chat. Nothing filed is deleted.
 *
 * The SOS needs a pod the account has joined; that seat is taken through the
 * API (a free, upcoming pod staging already has) because no support page
 * offers one.
 */

const TICKET_MESSAGE = 'I cancelled my seat three days ago and the refund has not reached my card yet.';

/** What an empty grievance says under each required box. */
const GRIEVANCE_REQUIRED = {
  support_ticket_ref: 'Support ticket is required',
  name: 'Full name is required',
  email: 'Email is required',
  phone: 'Phone is required',
  subject: 'Subject is required',
  description: 'What happened? is required',
} as const;

describe('06 Support', () => {
  const account = runAccount();
  const marker = runMarker(account.stamp, 'mweb');
  const problemReport = `${marker} The pod page stays blank after paying for a seat.`;
  const ticketSubject = `${marker} Refund not received`;
  const grievanceSubject = `${marker} Refund still missing after support`;
  const grievanceDescription = `${marker} My support ticket about a refund is still not settled after three days.`;
  const callbackReason = `${marker} Please call me about my refund.`;
  const sosMessage = `${marker} Need a first-aid kit at the venue entrance.`;
  const chatMessage = `${marker} Hi, I need help with a refund.`;

  before(() => {
    cy.apiLogin(account.email, account.password('CHANGED'));
  });

  describe('FAQs', () => {
    it('SP-01 FAQs, from the menu, lists the questions the server publishes', () => {
      firstFaq().then((faq) => {
        cy.interceptOperation('PublicFaqs');
        openFromMenu('sidebar-item-FAQs', '/faqs');
        cy.wait('@PublicFaqs');
        cy.byTestId('faqs-screen').should('be.visible');
        cy.byTestId('faqs-filter-all').should('have.attr', 'aria-pressed', 'true');
        cy.byTestIdPrefix('faq-').should('have.length.at.least', 1);
        cy.byTestId(`faq-${faq.id}`).should('contain.text', faq.question);
      });
    });

    it('SP-02 Help & Support › Topics › For You opens FAQs filtered to that topic', () => {
      faqGroupNamed('For You').then((group) => {
        const id = faqGroupId(group);
        cy.interceptOperation('PublicFaqGroups');
        openSupportHub();
        cy.wait('@PublicFaqGroups');
        cy.byTestId('support-topics-header-title').should('have.text', 'Topics');
        cy.byTestId(`support-topic-${id}`).should('contain.text', 'For You').click();
        cy.location('pathname').should('eq', '/faqs');
        cy.location('search').should('eq', `?cat=${id}`);
        cy.byTestId(`faqs-filter-${id}`).should('have.attr', 'aria-pressed', 'true');
        cy.byTestId('faqs-filter-all').should('have.attr', 'aria-pressed', 'false');
        cy.byTestId(`faqs-group-${id}-header-title`).should('have.text', 'For You');
        cy.byTestId(`faq-${group.faqs[0].id}`).should('contain.text', group.faqs[0].question);
      });
    });
  });

  describe('Report a Problem', () => {
    it('SP-03 a message shorter than the configured minimum is refused', () => {
      reportProblemForm().then((form) => {
        cy.interceptOperation('ReportProblemConfig');
        openSupportTile('feedback');
        cy.wait('@ReportProblemConfig');
        const tooShort = 'x'.repeat(form.minLength - 1);
        if (tooShort) cy.byTestId('field-message').type(tooShort);
        cy.byTestId('feedback-submit').should('have.text', 'Send feedback').click();
        cy.byTestId('message-error').should('have.text', `Please describe it in at least ${form.minLength} characters`);
        cy.byTestId('feedback-sent').should('not.exist');
      });
    });

    it('SP-04 a problem report, with a screenshot when the form takes one, reaches the team', () => {
      reportProblemForm().then((form) => {
        cy.interceptOperation('ReportProblemConfig');
        openSupportTile('feedback');
        cy.wait('@ReportProblemConfig');
        cy.byTestId(`feedback-cat-${form.category}`).click();
        cy.byTestId(`feedback-cat-${form.category}`).should('have.attr', 'aria-pressed', 'true');
        cy.byTestId('field-message').type(problemReport, { delay: 0 });
        if (form.allowMedia) {
          loadPhoto();
          attachThroughPicker(runPhoto(account.stamp, 'screenshot'));
        } else {
          cy.byTestId('media').should('not.exist');
          cy.log('Screenshots are switched off for Report a Problem on this server — sent without one.');
        }
        sendCode('SubmitAppFeedback', () => {
          cy.byTestId('feedback-submit').click();
        });
        cy.byTestId('feedback-sent').should('have.text', 'Thanks! Your feedback has been sent to our team.');
      });
    });
  });

  describe('support tickets', () => {
    it('SP-05 a subject under three characters and an empty message are refused', () => {
      openSupportTile('tickets');
      cy.byTestId('support-tickets-page').should('be.visible');
      cy.byTestId('field-subject').type('ab');
      cy.byTestId('ticket-submit').should('have.text', 'Send to support').click();
      cy.byTestId('subject-error').should('have.text', 'At least 3 characters');
      cy.byTestId('message-error').should('have.text', 'Message is required');
      cy.location('pathname').should('eq', '/support/tickets');
    });

    it('SP-06 a Question ticket with an attachment is created and opens its own page', () => {
      loadPhoto();
      openSupportTile('tickets');
      cy.byTestId('field-name').should('have.attr', 'readonly');
      cy.byTestId('field-name').should('not.have.value', '');
      cy.byTestId('field-email').should('have.attr', 'readonly');
      cy.byTestId('field-email').should(($input) => {
        expect(String($input.val()).toLowerCase(), 'the account email').to.equal(account.email.toLowerCase());
      });
      cy.byTestId('ticket-category').click();
      cy.byTestId('ticket-category-option-QUESTION').click();
      cy.byTestId('ticket-category').should('contain.text', 'Question / How do I…');
      fill('field-subject', ticketSubject);
      cy.byTestId('field-message').type(TICKET_MESSAGE, { delay: 0 });
      sendCode('GetImagekitAuth', () => {
        cy.byTestId('ticket-attach-input').selectFile(runPhoto(account.stamp, 'ticket'), { force: true });
      });
      cy.byTestIdPrefix('ticket-attach-http', '-0').should('have.length', 1);
      cy.byTestId('ticket-attach-error').should('not.exist');
      cy.interceptOperation('CreateMyTicket');
      cy.byTestId('ticket-submit').click();
      cy.wait('@CreateMyTicket')
        .its('response.body.data.createTicket.id')
        .then((id) => {
          cy.location('pathname').should('eq', `/tickets/${id}`);
        });
      cy.byTestId('ticket-header-subject').should('have.text', ticketSubject);
    });

    it('SP-07 All Support Tickets lists the ticket, and its row opens it', () => {
      filedTicket(ticketSubject).then((ticket) => {
        openSupportTile('all');
        cy.byTestId(`all-ticket-${ticket.ticket_no}`)
          .should('contain.text', ticketSubject)
          .and('contain.text', 'Support Ticket')
          .click();
        cy.location('pathname').should('eq', `/tickets/${ticket.id}`);
      });
    });
  });

  describe('Raise a Grievance', () => {
    it('SP-08 an empty grievance names every required box, and a short phone number is refused', () => {
      cy.interceptOperation('MyUnifiedSupportTickets');
      openSupportTile('grievance');
      cy.wait('@MyUnifiedSupportTickets');
      cy.byTestId('grievance-form').should('be.visible');
      cy.byTestId('grievance-form-submit').should('have.text', 'Submit grievance').and('be.enabled').click();
      for (const [field, message] of Object.entries(GRIEVANCE_REQUIRED)) {
        cy.byTestId(`${field}-error`).should('have.text', message);
      }
      cy.byTestId('field-phone').type('12');
      cy.byTestId('phone-error').should('have.text', 'Enter a valid phone number');
      cy.byTestId('grievance-sent').should('not.exist');
    });

    it('SP-09 a grievance escalating the ticket is received with a reference number', () => {
      filedTicket(ticketSubject).then((ticket) => {
        cy.interceptOperation('MyUnifiedSupportTickets');
        openSupportTile('grievance');
        cy.wait('@MyUnifiedSupportTickets');
        cy.byTestId('support_ticket_ref').click();
        cy.byTestId(`support-ticket-option-${ticket.ticket_no}`).should('contain.text', ticketSubject).click();
        cy.byTestId('support_ticket_ref').should('contain.text', ticket.ticket_no);
        fill('field-name', SIGNUP_NAME);
        fill('field-email', account.email);
        fill('field-phone', account.phone);
        fill('field-subject', grievanceSubject);
        cy.byTestId('field-description').type(grievanceDescription, { delay: 0 });
        sendCode('SubmitGrievance', () => {
          cy.byTestId('grievance-form-submit').click();
        });
        cy.byTestId('grievance-sent').should('contain.text', 'Grievance received');
        cy.byTestId('grievance-reference').invoke('text').should('match', /\S/);
      });
    });
  });

  it('SP-10 a callback request is received', () => {
    openSupportTile('callback');
    cy.byTestId('callback-content').should('be.visible');
    cy.byTestId('callback-reason').type(callbackReason, { delay: 0 });
    sendCode('RequestBouncerCallback', () => {
      cy.byTestId('callback-request').should('have.text', 'Request callback').click();
    });
    cy.byTestId('callback-success').should('contain.text', 'Callback requested. We will reach you shortly.');
    cy.byTestId('callback-error').should('not.exist');
  });

  it('SP-11 an SOS on a joined pod is sent and stays active', () => {
    joinFreePod().then((podId) => {
      cy.interceptOperation('MyActiveSupportPods');
      openSupportTile('sos');
      cy.wait('@MyActiveSupportPods');
      cy.byTestId('pod-picker').click();
      cy.byTestId(`pod-option-${podId}`).click();
      cy.byTestId('sos-warning').should('contain.text', 'Only tap SOS in a real emergency');
      cy.byTestId('sos-message').type(sosMessage, { delay: 0 });
      stubSosLocation();
      sendCode('RaiseBouncerSos', () => {
        cy.byTestId('sos-send').should('have.text', 'SEND SOS').click();
      });
      cy.byTestId('sos-active').should('contain.text', 'SOS sent. Help is on the way.');
      cy.byTestId('sos-status-chip').should('have.text', 'Awaiting response');
    });
  });

  it('SP-12 Start a conversation sends a chat message that stays in the thread', () => {
    openSupportHub();
    cy.interceptOperation('MySupportChat');
    cy.byTestId('support-start-chat').click();
    cy.location('pathname').should('eq', '/live-chat');
    cy.wait('@MySupportChat');
    cy.byTestId('support-chat-page').should('be.visible');
    cy.byTestId('support-chat-input-input').type(chatMessage, { delay: 0 });
    cy.interceptOperation('StartSupportChat');
    cy.interceptOperation('SendMySupportChatMessage');
    cy.interceptOperation('MySupportChatMessages');
    cy.byTestId('support-chat-send').click();
    cy.wait('@StartSupportChat');
    cy.wait('@SendMySupportChatMessage');
    cy.wait('@MySupportChatMessages');
    cy.byTestIdPrefix('support-msg-').should('contain.text', chatMessage);
    cy.byTestIdPrefix('retry-').should('not.exist');
  });
});
