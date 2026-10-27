import type { RunAccount } from '../../support/run-account';
import {
  PORTAL_FEATURES_API,
  apiToken,
  asAccount,
  closeChatPanelState,
  openSignedIn,
  runPasswordNow,
} from '../../support/ui-shell';
import { pickOption, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Staff chat, on Support: the docked "Coworkers" panel, its
 * directory (`Coworkers`, filtered by search and team on the server) and the
 * panel's own state, which `SaveStaffChatState` keeps so a reload reopens it.
 *
 * Read-only towards other people: no conversation is opened and no message,
 * reaction, file, location or call is sent — every one of those would reach a
 * real coworker. The suite also stubs the socket, so presence and the unread
 * ping are not observable here.
 */

interface Coworkers {
  coworkers: { id: string; name: string }[];
}

describe('Portal Shell · Staff chat (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
    apiToken('support', account).then((token) =>
      asAccount<{ portalMode: { chat_enabled: boolean } | null }>('support', token, PORTAL_FEATURES_API, { key: 'support' }).then(
        (data) => {
          if (data.portalMode?.chat_enabled === false) throw new Error('Staff chat is turned off for Support on staging.');
        },
      ),
    );
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account)).then((token) => closeChatPanelState('support', token));
  });

  it('SC-01 the panel docks beside the page with the directory the server returned', () => {
    openSignedIn('support', '/');
    cy.interceptOperation('Coworkers');
    cy.interceptOperation('StaffThreads');
    cy.byTestId('shell-header-chat').click();
    cy.byTestId('staff-chat-panel').should('be.visible').and('contain.text', 'Coworkers');
    cy.wait('@StaffThreads').then(({ response: threadsResponse }) => {
      const peers = new Set(
        ((threadsResponse?.body.data as { staffThreads: { peer: { id: string } }[] }).staffThreads ?? []).map((t) => t.peer.id),
      );
      cy.wait('@Coworkers').then(({ response }) => {
        const people = (response?.body.data as Coworkers).coworkers.filter((person) => !peers.has(person.id));
        cy.byTestIdPrefix('staff-chat-person-').should('have.length', people.length);
        if (people[0]) cy.byTestId(`staff-chat-person-${people[0].id}`).should('contain.text', people[0].name);
      });
    });
  });

  it('SC-02 search and team narrow the directory on the server; nobody matching says so', () => {
    const term = `zz-e2e-${account.stamp}`;
    openSignedIn('support', '/');
    cy.byTestId('shell-header-chat').click();
    cy.interceptOperation('Coworkers', 'Searched');
    cy.byTestId('staff-chat-search').type(term);
    cy.wait('@Searched').its('request.body.variables.search').should('eq', term);
    cy.byTestId('staff-chat-nobody').should('have.text', 'Nobody matches that.');
    cy.byTestIdPrefix('staff-chat-person-').should('not.exist');

    cy.byTestId('staff-chat-search').clear();
    cy.interceptOperation('Coworkers', 'ByTeam');
    pickOption('staff-chat-team', 'staff-chat-team-CRM_MANAGER');
    cy.wait('@ByTeam').its('request.body.variables.role').should('eq', 'CRM_MANAGER');
  });

  it('SC-03 the open panel is reopened after a reload; once closed it stays closed', () => {
    openSignedIn('support', '/');
    cy.interceptOperation('SaveStaffChatState');
    cy.byTestId('shell-header-chat').click();
    cy.wait('@SaveStaffChatState').its('request.body.variables.input').should('include', { panel_open: true });
    cy.reload();
    cy.byTestId('staff-chat-panel').should('be.visible');

    cy.interceptOperation('SaveStaffChatState', 'Closed');
    cy.byTestId('staff-chat-close').click();
    cy.wait('@Closed').its('request.body.variables.input').should('include', { panel_open: false });
    cy.byTestId('staff-chat-panel').should('not.exist');
    cy.reload();
    cy.byTestId('shell-user-menu-button').should('be.visible');
    cy.byTestId('staff-chat-panel').should('not.exist');
  });
});
