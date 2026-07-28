import { homeFixtures } from '../support/data';

const now = () => new Date().toISOString();

const chatFixtures = {
  ...homeFixtures(),
  MobileStartSupportChat: { startSupportChat: { id: 's1', status: 'OPEN' } },
  MobileSupportChatMessages: {
    supportChatMessages: [
      {
        id: 'm1',
        session_id: 's1',
        sender_id: 'u2',
        sender_role: 'SYSTEM',
        sender_name: 'Agent A',
        sender_photo: null,
        text: 'Picked up by Agent A',
        attachments: [],
        created_at: now(),
      },
    ],
  },
  MobileMarkSupportChatRead: { markSupportChatRead: { id: 's1', unread_for_user: 0 } },
  MobileMyTickets: {
    myTickets: [
      {
        id: 'tk1',
        subject: 'Refund issue',
        category: 'PAYMENT',
        status: 'OPEN',
        priority: 'LOW',
        message_count: 1,
        last_message_at: now(),
        created_at: now(),
      },
    ],
  },
  MobileUnifiedSupportTickets: {
    myUnifiedSupportTickets: [
      {
        id: 't1',
        ticket_no: 'ST-AAA111',
        title: 'Refund issue',
        status: 'OPEN',
        source: 'TICKET',
        created_at: now(),
      },
      {
        id: 'c1',
        ticket_no: 'CH-BBB222',
        title: 'Hi there',
        status: 'OPEN',
        source: 'CHAT',
        created_at: now(),
      },
    ],
  },
  MobileFaqs: {
    publicFaqGroups: [
      {
        super_category: { id: 'sc1', name: 'Getting started', icon: null, slug: 'getting-started' },
        faqs: [{ id: 'faq1', question: 'How do I join a pod?', answer: 'Tap join on any pod.' }],
      },
    ],
  },
};

describe('App · Support module', () => {
  beforeEach(() => {
    cy.mockGraphql(chatFixtures);
  });

  it('boot shows the branded splash overlay (other bug 1)', () => {
    // First load warms Metro's bundle (cold compiles outlast the 1.6s splash);
    // the reload then boots instantly so the splash window is observable.
    cy.visitApp('/');
    cy.byTestId('home-feed', { timeout: 60_000 }).should('be.visible');
    cy.reload();
    cy.byTestId('splash-overlay').should('be.visible');
    // …and it fades away on its own.
    cy.byTestId('splash-overlay', { timeout: 5_000 }).should('not.exist');
  });

  it('support help center: hero, FAQ topics, chat CTA + All Support Tickets, no Live Feedback', () => {
    cy.visitApp('/support');
    // FAQ-forward help center: hero + search, top FAQs, topics, chat CTA.
    cy.byTestId('support-hero-title').should('be.visible');
    cy.byTestId('support-search').should('be.visible');
    cy.byTestId('support-topic-sc1').should('be.visible');
    cy.byTestId('support-start-chat').should('be.visible');
    // The "more" grid sits below the fold; Cypress counts an element clipped by
    // a scroll ancestor as hidden, so scroll to it before asserting.
    cy.byTestId('support-more-all').scrollIntoView().should('be.visible');
    cy.contains('Create Support Tickets').should('be.visible');
    cy.contains('Live Feedback').should('not.exist');
    // FAQs + Policies are in the account drawer, not the support hub (BUG-06).
    cy.byTestId('support-faqs').should('not.exist');
    cy.byTestId('support-policies').should('not.exist');
  });

  it('Chat with Us is an inbox; the shortcut opens the real-time chat (BUG-04)', () => {
    cy.visitApp('/support/chat');
    // Inbox: a live-chat shortcut + the user's tickets (not a single thread).
    cy.byTestId('chat-with-us-screen').should('be.visible');
    cy.byTestId('chat-inbox-subtitle').should('be.visible');
    cy.byTestId('chat-live-card').should('be.visible');
    cy.byTestId('chat-inbox-ticket-tk1').should('be.visible');

    // The shortcut opens the real-time chat with its history (pickup bubble).
    cy.byTestId('chat-live-card').click();
    cy.byTestId('live-chat-screen').should('be.visible');
    cy.contains('Picked up by Agent A').should('be.visible');
    cy.byTestId('support-chat-input').should('be.visible');
  });

  it('All Support Tickets lists prefixed rows from every category (bug 1.6)', () => {
    cy.visitApp('/support/all');
    cy.byTestId('all-support-tickets-screen').should('be.visible');
    cy.byTestId('all-tickets-subtitle').should('be.visible');
    cy.contains('ST-AAA111').should('be.visible');
    cy.contains('CH-BBB222').should('be.visible');
  });

  it('callback screen has no pod picker (bug 1.2)', () => {
    cy.visitApp('/support');
    cy.byTestId('support-more-callback').click();
    cy.byTestId('callback-screen').should('be.visible');
    cy.byTestId('callback-subtitle').should('be.visible');
    cy.contains(/select a pod|choose a pod/i).should('not.exist');
  });

  it('Create Support Tickets opens onto the mWeb-style form (BUG-05/07/08/09)', () => {
    cy.visitApp('/support');
    cy.byTestId('support-more-tickets').click();
    cy.byTestId('support-tickets-screen').should('be.visible');
    // Form-first (no existing-tickets list), with name/email fields + banners.
    cy.byTestId('ticket-form').should('be.visible');
    cy.byTestId('ticket-name').should('be.visible');
    cy.byTestId('ticket-email').should('be.visible');
    cy.byTestId('ticket-attach-add').should('be.visible');
    cy.contains('Help squad is ready').should('be.visible');
    cy.contains('Send to support').should('be.visible');
    cy.contains('Submit ticket').should('not.exist');
    // Category is a dropdown with mWeb's friendly options, not chips.
    cy.byTestId('ticket-category').click();
    cy.byTestId('ticket-category-option-PAYMENT').should('be.visible');
    cy.contains('Payment / Refund').should('be.visible');
  });

  it('SOS shows a pod dropdown and the boxed emergency warning (BUG-10/11)', () => {
    cy.mockGraphql({
      MobileActiveSupportPods: {
        myPodMemberships: [
          {
            id: 'm1',
            pod: {
              id: 'p1',
              pod_id: 'sp1',
              pod_title: 'Sunset Jam',
              pod_date_time: now(),
              pod_end_date_time: null,
            },
          },
        ],
      },
    });
    cy.visitApp('/support');
    cy.byTestId('support-more-sos').click();
    cy.byTestId('sos-screen').should('be.visible');
    cy.byTestId('sos-subtitle').should('be.visible');
    cy.contains('Only tap SOS in a real emergency').should('be.visible');
    // Pod selector is a dropdown (not a fixed pill) — opens to a list.
    cy.byTestId('pod-picker').click();
    cy.byTestId('pod-picker-options').should('be.visible');
    cy.byTestId('pod-option-p1').should('be.visible');
  });

  it('support hub labels the callback card "Callback Request" (BUG-14)', () => {
    cy.visitApp('/support');
    cy.byTestId('support-more-callback').should('contain.text', 'Callback Request');
    cy.contains('Request a Callback').should('not.exist');
  });

  it('Call Now is disabled when no support phone is configured (BUG-13)', () => {
    cy.mockGraphql({
      MobileSupportCallTarget: { bouncerSupportTarget: { phone: '', available: false } },
    });
    cy.visitApp('/support');
    cy.byTestId('support-more-callback').click();
    cy.byTestId('callback-call-now').should('have.attr', 'aria-disabled', 'true');
  });

  it('requesting a callback shows a dismissible success alert (BUG-12)', () => {
    cy.mockGraphql({
      MobileSupportCallTarget: { bouncerSupportTarget: { phone: '+91123', available: true } },
      MobileRequestBouncerCallback: {
        requestBouncerCallback: { id: 'cb1', status: 'PENDING', created_at: now() },
      },
    });
    cy.visitApp('/support');
    cy.byTestId('support-more-callback').click();
    cy.byTestId('callback-request').click();
    cy.byTestId('callback-success').should('be.visible');
    cy.byTestId('callback-success-close').click();
    cy.byTestId('callback-success').should('not.exist');
  });
});
