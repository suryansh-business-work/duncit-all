import { runAddress } from '@duncit/utils';
import type { RunAccount } from '../../support/run-account';
import { expectConfirm, staffAccount } from '../../support/ui-staff';

/**
 * Support › Chat with Us (/live-chat): resolving, re-opening and exporting the
 * run account's own conversation (the mWeb member started it; the numbered
 * Support spec answered it), and the Create user account dialog.
 *
 * The conversation ends the way it started — OPEN — so the order the specs run
 * in does not matter, and the transcript goes to the run's own mailbox.
 */

const MY_SUPPORT_CHAT = `query E2eMyChatSession { mySupportChat { id status user { name } } }`;

interface Session {
  id: string;
  status: string;
  user: { name: string };
}

describe('Support · Chat with Us (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, account.password('CHANGED'));
  });

  it('SCW-01 Resolve asks first and moves the chat to Resolved; Re-open returns it to Open; the transcript is emailed', () => {
    cy.gql<{ mySupportChat: Session | null }>(MY_SUPPORT_CHAT).then(({ mySupportChat }) => {
      expect(mySupportChat, 'the run account has a Chat with Us session (mWeb starts it)').to.not.be.null;
      const session = mySupportChat as Session;
      expect(session.status, 'the session is open').to.equal('OPEN');

      cy.interceptOperation('SupportChatSessions');
      cy.visitPortal('support', '/live-chat');
      cy.wait('@SupportChatSessions');
      cy.byTestId(`live-chat-session-row-${session.id}`).click();
      cy.byTestId('live-chat-header-name').should('have.text', session.user.name);

      cy.byTestId('live-chat-resolve').should('have.text', 'Resolve').click();
      expectConfirm('Mark this chat resolved?');
      cy.interceptOperation('CloseSupportChat');
      cy.byTestId('confirm-dialog-confirm').click();
      cy.wait('@CloseSupportChat').its('response.body.errors').should('be.undefined');

      cy.byTestId('live-chat-tab-resolved').click();
      cy.byTestId('live-chat-tab-resolved').should('have.attr', 'aria-selected', 'true');
      cy.byTestId(`live-chat-session-row-${session.id}`).click();
      cy.interceptOperation('ReopenSupportChat');
      cy.byTestId('live-chat-reopen').should('have.text', 'Re-open').click();
      cy.wait('@ReopenSupportChat').its('response.body.errors').should('be.undefined');

      cy.byTestId('live-chat-tab-open').click();
      cy.byTestId('live-chat-tab-open').should('have.attr', 'aria-selected', 'true');
      cy.byTestId(`live-chat-session-row-${session.id}`).should('exist').click();

      cy.byTestId('transcript-menu-open').click();
      cy.byTestId('transcript-email-open').click();
      cy.byTestId('transcript-email-send').should('be.disabled');
      cy.byTestId('transcript-email-input').type(account.email, { delay: 0 });
      cy.interceptOperation('EmailSupportChatTranscript');
      cy.byTestId('transcript-email-send').click();
      cy.wait('@EmailSupportChatTranscript').its('response.body.errors').should('be.undefined');
      cy.byTestId('live-chat-notice').should('contain.text', `Transcript emailed to ${account.email}.`);
    });
  });

  it('SCW-02 Create user account keeps Create disabled until a first name, an email and an 8-character password', () => {
    cy.visitPortal('support', '/live-chat');
    cy.byTestId('live-chat-create-user').click();
    cy.byTestId('create-user-dialog').should('contain.text', 'Create user account');
    cy.byTestId('create-user-submit').should('be.disabled');
    cy.byTestId('create-user-first-name').type('Suite', { delay: 0 });
    cy.byTestId('create-user-email').type(runAddress(account.email, 'support-created'), { delay: 0 });
    cy.byTestId('create-user-password').type('Short7!', { delay: 0 });
    cy.byTestId('create-user-submit').should('be.disabled');
    cy.byTestId('create-user-password').type('x', { delay: 0 });
    cy.byTestId('create-user-submit').should('be.enabled');
    cy.byTestId('create-user-close').click();
    cy.byTestId('create-user-dialog').should('not.exist');
  });

  // The address is a run address, which the purge removes.
  it('SCW-03 Create account makes the account and says so', () => {
    const email = runAddress(account.email, 'support-created');
    cy.visitPortal('support', '/live-chat');
    cy.byTestId('live-chat-create-user').click();
    cy.byTestId('create-user-first-name').type('Suite', { delay: 0 });
    cy.byTestId('create-user-email').type(email, { delay: 0 });
    cy.byTestId('create-user-password').type(`${account.password('CHANGED')}-S`, { log: false });
    cy.interceptOperation('SupportCreateUser');
    cy.byTestId('create-user-submit').click();
    cy.wait('@SupportCreateUser').its('response.body.errors').should('be.undefined');
    cy.byTestId('create-user-done').should('have.text', `Account created for ${email}.`);
    cy.byTestId('create-user-close').click();
    cy.byTestId('live-chat-create-user').click();
    cy.byTestId('create-user-done').should('not.exist');
  });
});
