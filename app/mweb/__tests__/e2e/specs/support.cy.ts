/// <reference types="cypress" />

import { bootFixtures, past, podDetailFixtures } from '../support/data';

const now = () => new Date().toISOString();

const unifiedRows = [
  { id: 't1', ticket_no: 'ST-AAA111', title: 'Refund issue', status: 'OPEN', source: 'TICKET', created_at: now() },
  { id: 's1', ticket_no: 'SOS-BBB222', title: 'Help', status: 'RESOLVED', source: 'SOS', created_at: now() },
  { id: 'c1', ticket_no: 'CB-CCC333', title: 'Call me', status: 'PENDING', source: 'CALLBACK', created_at: now() },
  { id: 'h1', ticket_no: 'CH-DDD444', title: 'Hi there', status: 'OPEN', source: 'CHAT', created_at: now() },
];

describe('Support module', () => {
  beforeEach(() => {
    cy.blockThirdParty();
    cy.seedAuth();
  });

  it('hub shows the renamed sections and no Live Feedback (bugs 1.3-1.6)', () => {
    cy.mockGraphql(bootFixtures);
    cy.visitApp('/support');
    cy.contains('Create Support Tickets').should('be.visible');
    cy.contains('All Support Tickets').should('be.visible');
    cy.contains('Chat with our support team in real time').should('be.visible');
    cy.contains('Live Feedback').should('not.exist');
    cy.contains('Live Tickets').should('not.exist');
  });

  it('the native /support/chat path resolves instead of 404ing (BUG-02)', () => {
    cy.mockGraphql(bootFixtures);
    cy.visitApp('/support/chat');
    // Redirects to the canonical Chat-with-Us route rather than the 404 page.
    cy.location('pathname').should('eq', '/support/live');
    cy.contains('Page not found').should('not.exist');
  });

  it('callback request needs no pod selection (bug 1.2)', () => {
    cy.mockGraphql({
      ...bootFixtures,
      SupportCallTarget: { bouncerSupportTarget: { phone: '+91123', label: 'Support' } },
    });
    cy.visitApp('/support/callback');
    cy.contains('Callback Request').should('be.visible');
    // The pod picker is gone — no pod dropdown on this page.
    cy.contains(/Select a pod|Choose a pod/i).should('not.exist');
  });

  it('All Support Tickets lists every category with prefixed ids (bug 1.6)', () => {
    cy.mockGraphql({
      ...bootFixtures,
      MyUnifiedSupportTickets: { myUnifiedSupportTickets: unifiedRows },
    });
    cy.visitApp('/support/all');
    cy.contains('ST-AAA111').should('be.visible');
    cy.contains('SOS-BBB222').should('be.visible');
    cy.contains('CB-CCC333').should('be.visible');
    cy.contains('CH-DDD444').should('be.visible');
    cy.contains(/^Callback Request$/).should('be.visible');
  });

  it('creating a ticket redirects to its details page (bug 1.4)', () => {
    cy.mockGraphql({
      ...bootFixtures,
      CreateMyTicket: {
        createTicket: { id: 'tk9', subject: 'Broken page', status: 'OPEN', category: 'TECHNICAL', created_at: now() },
      },
      MyTicket: {
        ticket: {
          id: 'tk9', subject: 'Broken page', category: 'TECHNICAL', status: 'OPEN', priority: 'NORMAL',
          assignee_id: null, assignee_name: null, last_message_at: now(),
          message_count: 1, messages: [], created_at: now(), updated_at: now(),
          user: { id: 'u1', name: 'Test User', phone: null, avatar_url: null },
        },
      },
    });
    cy.visitApp('/support/tickets');
    // Name/Email are auto-filled from the account query; waiting for that value
    // also parks the test until the form has stopped re-rendering.
    cy.get('input[name="name"]').should('have.value', 'Test User');
    // Query by `name` — the MUI-generated input ids change across re-renders.
    cy.contains('label', 'Subject').should('be.visible');
    cy.get('input[name="subject"]').should('be.enabled').type('Broken page');
    cy.contains('label', /Tell us what's going on/).should('be.visible');
    cy.get('textarea[name="message"]').should('be.enabled').type('The page crashes when I tap save.');
    // A floating overlay (community FAB) hovers above the submit on mobile
    // viewports — force the click through it.
    cy.contains('button', 'Send to support').click({ force: true });
    cy.location('pathname').should('match', /\/tickets\/tk9/);
  });

  it('policy page offers View + Download PDF (other bug 2)', () => {
    cy.mockGraphql({
      ...bootFixtures,
      PolicyBySlug: {
        policyBySlug: {
          id: 'p1', slug: 'privacy-policy', title: 'Privacy Policy',
          content: '<p>We respect your privacy.</p>', is_active: true,
          created_at: now(), updated_at: now(),
        },
      },
    });
    cy.visitApp('/policies/privacy-policy');
    cy.contains('button', 'View PDF').should('be.visible');
    cy.contains('button', 'Download PDF').should('be.visible');
  });

  it('an expired pod blocks checkout (other bug 3)', () => {
    cy.mockGraphql(podDetailFixtures({ pod_date_time: past(2) }));
    cy.visitApp('/club/jazz-club/pod/sunset-jam');
    cy.contains(/already taken place — booking is closed/i).should('be.visible');
    cy.contains('button', /^Join/).should('not.exist');
  });

  it('the pod map renders via the keyless embed (other bug 4)', () => {
    cy.mockGraphql(podDetailFixtures());
    cy.visitApp('/club/jazz-club/pod/sunset-jam');
    cy.get('iframe[title="Pod location map"]')
      .should('have.attr', 'src')
      .and('match', /output=embed/)
      .and('not.match', /maps\/embed\/v1/);
  });
});
