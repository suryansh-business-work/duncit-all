/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';

/**
 * Notifications inbox (UI), live on staging, on the run account's own inbox.
 *
 * What the account holds by now depends on what the earlier legs did to it
 * (support replies, role changes), so the unread count is read from the
 * server first and the scenario asserts the path that count implies. Only
 * the account's own read state changes.
 */

const INBOX = `query E2eUiInbox { myNotifications(limit: 30) { id read_at } myUnreadNotificationCount }`;

interface Inbox {
  myNotifications: Array<{ id: string; read_at: string | null }>;
  myUnreadNotificationCount: number;
}

const markAll = () => cy.byTestId('notifications-mark-all');
const subtitle = () => cy.byTestId('notifications-subtitle');

function openInbox(): void {
  cy.interceptOperation('MyNotifications');
  cy.visitApp('/');
  cy.wait('@MyNotifications');
  cy.byTestId('notifications-bell').click();
  cy.byTestId('notifications-screen').should('be.visible');
  cy.byTestId('notifications-screen-title').should('have.text', 'Notifications');
}

describe('Notifications', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  it('NT-01 Mark all as read clears every unread row; with nothing unread it is disabled and the inbox is All caught up', () => {
    cy.gql<Inbox>(INBOX).then((inbox) => {
      const unread = inbox.myNotifications.filter((row) => !row.read_at).length || inbox.myUnreadNotificationCount;
      openInbox();
      if (unread > 0) {
        subtitle().should('have.text', `${unread} unread update${unread === 1 ? '' : 's'}`);
        cy.byTestId('notifications-bell').should('have.attr', 'aria-label', `Notifications (${unread} unread)`);
        cy.interceptOperation('MarkAllRead');
        markAll().should('be.enabled').click();
        cy.wait('@MarkAllRead');
        cy.wait('@MyNotifications');
        inbox.myNotifications.forEach((row) => cy.byTestId(`notification-new-${row.id}`).should('not.exist'));
      }
      subtitle().should('have.text', 'All caught up');
      markAll().should('be.disabled');
      cy.byTestId('notifications-close').click();
      cy.byTestId('notifications-bell').should('have.attr', 'aria-label', 'Notifications');
      cy.gql<Inbox>(INBOX).its('myUnreadNotificationCount').should('eq', 0);
    });
  });
});
