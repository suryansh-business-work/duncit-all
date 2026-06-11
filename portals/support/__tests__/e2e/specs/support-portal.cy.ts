/// <reference types="cypress" />

// Authenticated Support-portal journeys. Each test seeds a token and mocks the
// GraphQL operations the screen fires (the shell loads `SessionMe` + branding).

const AGENT = {
  user_id: 'agent-1',
  full_name: 'Sam Agent',
  first_name: 'Sam',
  last_name: 'Agent',
  email: 'sam@duncit.com',
  roles: ['SUPPORT_MANAGER'],
  profile_photo: null,
};

const BRANDING = {
  branding: { app_name: 'Duncit', logo_url: '/duncit-logo.svg', primary_color: '#10b981', support_email: 'help@duncit.com' },
};

function shellMocks() {
  return {
    SessionMe: { data: { me: AGENT } },
    AppBranding: { data: BRANDING },
  };
}

describe('Support portal (authenticated)', () => {
  beforeEach(() => {
    cy.seedAuth();
  });

  it('shows the dashboard with live counts', () => {
    cy.mockGraphql({
      ...shellMocks(),
      BouncerSosAlerts: { data: { bouncerSosAlerts: [{ id: 's1', status: 'ACTIVE', message: '', contact_phone: '', acknowledged_at: null, resolved_at: null, created_at: new Date().toISOString(), location: null, user: { id: 'u', name: 'Riya', phone: null, avatar_url: null }, host: null, pod: { id: 'p', title: 'Run', venue_name: null, club_name: null, starts_at: null } }] } },
      BouncerCallbackRequests: { data: { bouncerCallbackRequests: [] } },
      Tickets: { data: { tickets: [] } },
      SupportChatSessions: { data: { supportChatSessions: [] } },
    });
    cy.visit('/');
    cy.contains(/support dashboard/i, { timeout: 10000 }).should('be.visible');
    cy.contains('Active SOS alerts').should('be.visible');
    cy.contains('Open tickets').should('be.visible');
  });

  it('lists SOS alerts and opens a detail screen', () => {
    const alert = {
      id: 'sos-1', status: 'ACTIVE', message: 'Need help', contact_phone: '+919800000000',
      acknowledged_at: null, resolved_at: null, created_at: new Date().toISOString(), location: null,
      user: { id: 'u1', name: 'Riya', phone: '+919800000000', avatar_url: null }, host: null,
      pod: { id: 'p1', title: 'Saturday Run', venue_name: 'Park', club_name: null, starts_at: null },
    };
    cy.mockGraphql({ ...shellMocks(), BouncerSosAlerts: { data: { bouncerSosAlerts: [alert] } } });
    cy.visit('/sos');
    cy.contains('SOS Alerts', { timeout: 10000 }).should('be.visible');
    cy.contains('td', 'Riya').click();
    cy.location('pathname').should('eq', '/sos/sos-1');
    cy.contains('Need help').should('be.visible');
  });

  it('opens the new-ticket dialog with a rich-text body and upload control', () => {
    cy.mockGraphql({ ...shellMocks(), Tickets: { data: { tickets: [] } } });
    cy.visit('/tickets');
    cy.contains('button', /new ticket/i, { timeout: 10000 }).click();
    cy.contains('New Ticket').should('be.visible');
    cy.get('[role="dialog"]').within(() => {
      cy.contains(/attach/i).should('exist'); // common upload component
      cy.get('.ql-editor').should('exist'); // rich-text editor
    });
  });

  it('shows the live-chat session sidebar', () => {
    const session = {
      id: 'sess-1', status: 'OPEN', last_message_at: new Date().toISOString(), last_message_preview: 'Hi there',
      unread_for_agent: 2, agent_id: null, user: { id: 'u1', name: 'Riya', phone: '+919800000000', avatar_url: null },
    };
    cy.mockGraphql({
      ...shellMocks(),
      SupportChatSessions: { data: { supportChatSessions: [session] } },
    });
    cy.visit('/live-chat');
    cy.contains('Chat with Us', { timeout: 10000 }).should('be.visible');
    cy.contains('Riya').should('be.visible');
    cy.contains(/select a session/i).should('be.visible');
  });

  it('redirects an unauthorised role away from the portal', () => {
    cy.mockGraphql({
      SessionMe: { data: { me: { ...AGENT, roles: ['USER'] } } },
      AppBranding: { data: BRANDING },
    });
    cy.visit('/');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/login');
  });
});
