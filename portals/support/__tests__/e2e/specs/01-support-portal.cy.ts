import { assertInsideShell, openLogin, submitPassword } from '../support/login-page';
import {
  CALLBACKS_LOOKUP,
  CHAT_INBOX_PAGE,
  CHAT_MESSAGES,
  MY_SUPPORT_CHAT,
  REPORTED_PROBLEMS_LOOKUP,
  SOS_LOOKUP,
  TICKETS_LOOKUP,
} from '../support/operations';
import { grantStaffRoles, runAccount, type RunAccount } from '../support/run-account';
import { openRow, openTable, searchTable } from '../support/tables';

/**
 * Support portal, following what the mWeb member filed (run account, password
 * CHANGED): a reported problem, a support ticket, a callback request, an SOS and
 * a Chat with Us conversation, each found by the run's marker.
 *
 * `before()` grants the run account SUPPORT_MANAGER, LEGAL_MANAGER and
 * ALL_PODS_ACCESS — once, for all three specs, since roles travel in the token
 * and every sign-in after the grant carries them.
 *
 * Every record is looked up through the API first, so the spec knows the id
 * its row is named by; the screen is then driven exactly as Support drives it.
 * The callback is closed and the SOS resolved on the way out, which frees the
 * member's pod for the next run.
 */

/** The first page of Chat with Us, as the page itself asks for it. */
const INBOX_PAGE_SIZE = 25;

interface ReportedProblem {
  id: string;
  report_no: string;
  message: string;
  status: string;
}

interface Ticket {
  id: string;
  ticket_no: string;
  subject: string;
}

interface CallbackRequest {
  id: string;
  reason: string;
  status: string;
  user: { name: string };
}

interface SosAlert {
  id: string;
  message: string;
  status: string;
  user: { name: string };
  pod: { title: string };
}

interface ChatSession {
  id: string;
  status: string;
  agent_id: string | null;
  user: { id: string; name: string };
}

interface ChatMessage {
  id: string;
  sender_role: string;
  text: string;
}

/** The newest record the lookup returned — the one the member filed in this run. */
function newest<T>(rows: readonly T[], what: string, marker: string): T {
  expect(rows, `the ${what} carrying ${marker}`).to.have.length.greaterThan(0);
  return rows[0];
}

const findReportedProblem = (marker: string) =>
  cy
    .gql<{ reportedProblemsTable: { rows: ReportedProblem[] } }>(REPORTED_PROBLEMS_LOOKUP, {
      query: { search: marker, page: 1, page_size: 10 },
    })
    .then((data) => newest(data.reportedProblemsTable.rows, 'reported problem', marker));

const findTicket = (marker: string) =>
  cy
    .gql<{ tickets: { items: Ticket[] } }>(TICKETS_LOOKUP, { search: marker })
    .then((data) => newest(data.tickets.items, 'support ticket', marker));

const findCallback = (marker: string) =>
  cy
    .gql<{ bouncerCallbackRequests: { items: CallbackRequest[] } }>(CALLBACKS_LOOKUP, { search: marker })
    .then((data) => newest(data.bouncerCallbackRequests.items, 'callback request', marker));

const findSos = (marker: string) =>
  cy
    .gql<{ bouncerSosAlerts: { items: SosAlert[] } }>(SOS_LOOKUP, { search: marker })
    .then((data) => newest(data.bouncerSosAlerts.items, 'SOS alert', marker));

/** Press a detail-page action and wait for the server to take it. */
function pressAndWait(testId: string, label: string, operation: string): void {
  cy.interceptOperation(operation);
  cy.byTestId(testId).should('contain.text', label).click();
  cy.wait(`@${operation}`).its('response.body.errors').should('be.undefined');
}

/** The run account's session: open, and on the first page of the inbox. */
function findChatSession(): Cypress.Chainable<ChatSession> {
  return cy.gql<{ mySupportChat: ChatSession | null }>(MY_SUPPORT_CHAT).then(({ mySupportChat }) => {
    expect(mySupportChat, 'the run account has a Chat with Us session').to.not.equal(null);
    const session = mySupportChat as ChatSession;
    expect(session.status, 'the session is still open').to.equal('OPEN');
    return cy
      .gql<{ supportChatSessions: { items: { id: string }[] } }>(CHAT_INBOX_PAGE, {
        status: 'OPEN',
        page_size: INBOX_PAGE_SIZE,
      })
      .then((inbox) => {
        expect(inbox.supportChatSessions.items.map((item) => item.id), 'the first page of the inbox').to.include(session.id);
        return session;
      });
  });
}

/** The member's message carrying the marker. */
function findMemberMessage(sessionId: string, marker: string): Cypress.Chainable<ChatMessage> {
  return cy.gql<{ supportChatMessages: ChatMessage[] }>(CHAT_MESSAGES, { session_id: sessionId }).then((data) => {
    const sent = data.supportChatMessages.find((m) => m.sender_role === 'USER' && m.text.includes(marker));
    expect(sent, `the member's message carrying ${marker}`).to.not.equal(undefined);
    return sent as ChatMessage;
  });
}

/** Chat with Us › the session's row, and wait for its thread. */
function openChatThread(session: ChatSession): void {
  cy.interceptOperation('SupportChatSessions');
  cy.interceptOperation('SupportChatMessages');
  cy.interceptOperation('MarkSupportChatRead');
  cy.interceptOperation('ClaimSupportChat');
  cy.visitPortal('support', '/live-chat');
  cy.wait('@SupportChatSessions');
  cy.byTestId('live-chat-tab-open').should('contain.text', 'Open').and('have.attr', 'aria-selected', 'true');
  cy.byTestId(`live-chat-session-row-${session.id}`).should('contain.text', session.user.name).click();
  // An unclaimed session is picked up by the first agent who opens it.
  if (!session.agent_id) {
    cy.wait('@ClaimSupportChat').its('response.body.data.claimSupportChat.agent_id').should('be.a', 'string');
  }
  cy.wait('@MarkSupportChatRead');
  cy.wait('@SupportChatMessages');
  cy.byTestId('live-chat-header-name').should('have.text', session.user.name);
}

describe('Support portal · what the mWeb member filed (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = runAccount();
    grantStaffRoles(account);
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, account.password('CHANGED'));
  });

  it('SPS-01 the run account signs in to Support with its password and lands inside the shell', () => {
    openLogin('support');
    submitPassword(account.email, account.password('CHANGED'));
    assertInsideShell('support');
  });

  it('SPS-02 Reported Problems › Problems finds the report by What happened, and its row opens the problem', () => {
    const marker = account.mwebMarker;
    findReportedProblem(marker).then((report) => {
      openTable('support', '/reported-problems', 'ReportedProblemsTable');
      cy.byTestId('page-header-title').should('have.text', 'Reported Problems');
      searchTable('ReportedProblemsTable', marker);
      cy.interceptOperation('ReportedProblem');
      openRow('support-reported-problems', report.id, [marker]);
      cy.wait('@ReportedProblem');
      cy.location('pathname').should('eq', `/reported-problems/${report.id}`);
      cy.byTestId('reported-problem-report-no').should('have.text', report.report_no);
      cy.byTestId('reported-problem-message').should('contain.text', marker);
      cy.byTestId('reported-problem-status').should('have.text', report.status);
      cy.byTestId('reported-problem-status-select').should('contain.text', report.status.replaceAll('_', ' '));
    });
  });

  it('SPS-03 Tickets finds the ticket by Subject, and its row opens the ticket titled with that subject', () => {
    const marker = account.mwebMarker;
    findTicket(marker).then((ticket) => {
      openTable('support', '/tickets', 'Tickets');
      cy.byTestId('page-header-title').should('have.text', 'Tickets');
      searchTable('Tickets', marker);
      cy.interceptOperation('Ticket');
      openRow('support-tickets', ticket.id, [ticket.ticket_no, ticket.subject]);
      cy.wait('@Ticket');
      cy.location('pathname').should('eq', `/tickets/${ticket.id}`);
      cy.byTestId('back-header-title').should('have.text', ticket.subject);
    });
  });

  it('SPS-04 Callback Requests opens the request by its row, then Mark contacted and Close move its status', () => {
    const marker = account.mwebMarker;
    findCallback(marker).then((callback) => {
      openTable('support', '/callbacks', 'BouncerCallbackRequests');
      cy.byTestId('page-header-title').should('have.text', 'Callback Requests');
      searchTable('BouncerCallbackRequests', marker);
      cy.interceptOperation('BouncerCallbackRequest');
      openRow('support-callbacks', callback.id, [callback.user.name, callback.status]);
      cy.wait('@BouncerCallbackRequest');
      cy.location('pathname').should('eq', `/callbacks/${callback.id}`);
      cy.byTestId('back-header-title').should('have.text', 'Callback Request');
      cy.byTestId('callback-detail-user').should('have.text', callback.user.name);
      cy.byTestId('callback-detail-reason').should('contain.text', marker);
      cy.byTestId('callback-detail-status').should('have.text', 'PENDING');

      pressAndWait('callback-mark-contacted', 'Mark contacted', 'MarkBouncerCallbackContacted');
      cy.byTestId('callback-detail-status').should('have.text', 'CONTACTED');
      cy.byTestId('callback-mark-contacted').should('not.exist');

      pressAndWait('callback-close', 'Close', 'CloseBouncerCallback');
      cy.byTestId('callback-detail-status').should('have.text', 'CLOSED');
      cy.byTestId('callback-close').should('not.exist');
    });
  });

  it('SPS-05 SOS Alerts opens the alert by its User and Pod, then Acknowledge and Mark resolved close it', () => {
    const marker = account.mwebMarker;
    findSos(marker).then((sos) => {
      openTable('support', '/sos', 'BouncerSosAlerts');
      cy.byTestId('page-header-title').should('have.text', 'SOS Alerts');
      searchTable('BouncerSosAlerts', marker);
      cy.interceptOperation('BouncerSosAlert');
      openRow('support-sos', sos.id, [sos.user.name, sos.pod.title]);
      cy.wait('@BouncerSosAlert');
      cy.location('pathname').should('eq', `/sos/${sos.id}`);
      cy.byTestId('back-header-title').should('have.text', 'SOS Alert');
      cy.byTestId('sos-detail-user').should('have.text', sos.user.name);
      cy.byTestId('sos-detail-message').should('contain.text', marker);
      cy.byTestId('sos-detail-status').should('have.text', 'ACTIVE');

      pressAndWait('sos-acknowledge', 'Acknowledge', 'AcknowledgeBouncerSos');
      cy.byTestId('sos-detail-status').should('have.text', 'ACKNOWLEDGED');
      cy.byTestId('sos-acknowledge').should('not.exist');

      pressAndWait('sos-resolve', 'Mark resolved', 'ResolveBouncerSos');
      cy.byTestId('sos-detail-status').should('have.text', 'RESOLVED');
      cy.byTestId('sos-resolve').should('not.exist');
    });
  });

  it('SPS-06 Chat with Us opens the member’s conversation, and a reply sent as Support lands in the thread', () => {
    const marker = account.mwebMarker;
    const reply = `${marker} Support portal reply`;
    findChatSession().then((session) => {
      findMemberMessage(session.id, marker).then((memberMessage) => {
        openChatThread(session);
        cy.byTestId(`live-chat-message-${memberMessage.id}`).should('contain.text', marker);

        cy.interceptOperation('SendSupportChatMessage');
        cy.byTestId('live-chat-composer-input').type(reply);
        cy.byTestId('live-chat-send').should('contain.text', 'Send').click();
        cy.wait('@SendSupportChatMessage').its('response.body.data.sendSupportChatMessage').as('sent');
        cy.byTestId('live-chat-composer-input').should('have.value', '');
      });
    });

    // The thread appends a sent message when the socket echoes it, and the suite
    // stubs the socket — so the reply is read back from the server by opening
    // the conversation again, which is also what proves it was kept.
    cy.get<ChatMessage>('@sent').then((sent) => {
      expect(sent.sender_role, 'the reply is sent as an agent').to.equal('AGENT');
      findChatSession().then((session) => {
        openChatThread(session);
        cy.byTestId(`live-chat-message-${sent.id}`).should('contain.text', reply);
      });
    });
  });
});
