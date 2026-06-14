import { test, expect } from '@playwright/test';
import { mockGraphql } from './support/gql';
import { seedAuth } from './support/auth';
import { homeFixtures } from './support/data';

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
        created_at: new Date().toISOString(),
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
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ],
  },
  MobileUnifiedSupportTickets: {
    myUnifiedSupportTickets: [
      { id: 't1', ticket_no: 'ST-AAA111', title: 'Refund issue', status: 'OPEN', source: 'TICKET', created_at: new Date().toISOString() },
      { id: 'c1', ticket_no: 'CH-BBB222', title: 'Hi there', status: 'OPEN', source: 'CHAT', created_at: new Date().toISOString() },
    ],
  },
};

test.describe('App · Support module', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockGraphql(page, chatFixtures);
  });

  test('boot shows the branded splash overlay (other bug 1)', async ({ page }) => {
    // First load warms Metro's bundle (cold compiles outlast the 1.6s splash);
    // the reload then boots instantly so the splash window is observable.
    await page.goto('/');
    await expect(page.getByTestId('home-feed')).toBeVisible({ timeout: 60_000 });
    await page.reload({ waitUntil: 'commit' });
    await expect(page.getByTestId('splash-overlay')).toBeVisible();
    // …and it fades away on its own.
    await expect(page.getByTestId('splash-overlay')).toBeHidden({ timeout: 5_000 });
  });

  test('support hub shows Chat with Us + All Support Tickets, no Live Feedback', async ({ page }) => {
    await page.goto('/support');
    await expect(page.getByTestId('support-intro')).toBeVisible();
    await expect(page.getByTestId('support-chat')).toBeVisible();
    await expect(page.getByTestId('support-all')).toBeVisible();
    await expect(page.getByText('Create Support Tickets')).toBeVisible();
    await expect(page.getByText('Live Feedback')).toHaveCount(0);
    // FAQs + Policies are in the account drawer, not the support hub (BUG-06).
    await expect(page.getByTestId('support-faqs')).toHaveCount(0);
    await expect(page.getByTestId('support-policies')).toHaveCount(0);
  });

  test('Chat with Us is an inbox; the shortcut opens the real-time chat (BUG-04)', async ({ page }) => {
    await page.goto('/support/chat');
    // Inbox: a live-chat shortcut + the user's tickets (not a single thread).
    await expect(page.getByTestId('chat-with-us-screen')).toBeVisible();
    await expect(page.getByTestId('chat-inbox-subtitle')).toBeVisible();
    await expect(page.getByTestId('chat-live-card')).toBeVisible();
    await expect(page.getByTestId('chat-inbox-ticket-tk1')).toBeVisible();

    // The shortcut opens the real-time chat with its history (pickup bubble).
    await page.getByTestId('chat-live-card').click();
    await expect(page.getByTestId('live-chat-screen')).toBeVisible();
    await expect(page.getByText('Picked up by Agent A')).toBeVisible();
    await expect(page.getByTestId('support-chat-input')).toBeVisible();
  });

  test('All Support Tickets lists prefixed rows from every category (bug 1.6)', async ({ page }) => {
    await page.goto('/support/all');
    await expect(page.getByTestId('all-support-tickets-screen')).toBeVisible();
    await expect(page.getByTestId('all-tickets-subtitle')).toBeVisible();
    await expect(page.getByText('ST-AAA111')).toBeVisible();
    await expect(page.getByText('CH-BBB222')).toBeVisible();
  });

  test('callback screen has no pod picker (bug 1.2)', async ({ page }) => {
    await page.goto('/support');
    await page.getByTestId('support-callback').click();
    await expect(page.getByTestId('callback-screen')).toBeVisible();
    await expect(page.getByTestId('callback-subtitle')).toBeVisible();
    await expect(page.getByText(/select a pod|choose a pod/i)).toHaveCount(0);
  });

  test('Create Support Tickets opens onto the mWeb-style form (BUG-05/07/08/09)', async ({ page }) => {
    await page.goto('/support');
    await page.getByTestId('support-tickets').click();
    await expect(page.getByTestId('support-tickets-screen')).toBeVisible();
    // Form-first (no existing-tickets list), with name/email fields + banners.
    await expect(page.getByTestId('ticket-form')).toBeVisible();
    await expect(page.getByTestId('ticket-name')).toBeVisible();
    await expect(page.getByTestId('ticket-email')).toBeVisible();
    await expect(page.getByTestId('ticket-attach-add')).toBeVisible();
    await expect(page.getByText('Help squad is ready')).toBeVisible();
    await expect(page.getByText('Send to support')).toBeVisible();
    await expect(page.getByText('Submit ticket')).toHaveCount(0);
    // Category is a dropdown with mWeb's friendly options, not chips.
    await page.getByTestId('ticket-category').click();
    await expect(page.getByTestId('ticket-category-option-PAYMENT')).toBeVisible();
    await expect(page.getByText('Payment / Refund')).toBeVisible();
  });

  test('SOS shows a pod dropdown and the boxed emergency warning (BUG-10/11)', async ({ page }) => {
    await mockGraphql(page, {
      ...chatFixtures,
      MobileActiveSupportPods: {
        myPodMemberships: [
          {
            id: 'm1',
            pod: {
              id: 'p1',
              pod_id: 'sp1',
              pod_title: 'Sunset Jam',
              pod_date_time: new Date().toISOString(),
              pod_end_date_time: null,
            },
          },
        ],
      },
    });
    await page.goto('/support');
    await page.getByTestId('support-sos').click();
    await expect(page.getByTestId('sos-screen')).toBeVisible();
    await expect(page.getByTestId('sos-subtitle')).toBeVisible();
    await expect(page.getByText('Only tap SOS in a real emergency')).toBeVisible();
    // Pod selector is a dropdown (not a fixed pill) — opens to a list.
    await page.getByTestId('pod-picker').click();
    await expect(page.getByTestId('pod-picker-options')).toBeVisible();
    await expect(page.getByTestId('pod-option-p1')).toBeVisible();
  });

  test('support hub labels the callback card "Callback Request" (BUG-14)', async ({ page }) => {
    await page.goto('/support');
    await expect(page.getByTestId('support-callback')).toContainText('Callback Request');
    await expect(page.getByText('Request a Callback')).toHaveCount(0);
  });

  test('Call Now is disabled when no support phone is configured (BUG-13)', async ({ page }) => {
    await mockGraphql(page, {
      ...chatFixtures,
      MobileSupportCallTarget: { bouncerSupportTarget: { phone: '', available: false } },
    });
    await page.goto('/support');
    await page.getByTestId('support-callback').click();
    await expect(page.getByTestId('callback-call-now')).toHaveAttribute('aria-disabled', 'true');
  });

  test('requesting a callback shows a dismissible success alert (BUG-12)', async ({ page }) => {
    await mockGraphql(page, {
      ...chatFixtures,
      MobileSupportCallTarget: { bouncerSupportTarget: { phone: '+91123', available: true } },
      MobileRequestBouncerCallback: {
        requestBouncerCallback: { id: 'cb1', status: 'PENDING', created_at: new Date().toISOString() },
      },
    });
    await page.goto('/support');
    await page.getByTestId('support-callback').click();
    await page.getByTestId('callback-request').click();
    await expect(page.getByTestId('callback-success')).toBeVisible();
    await page.getByTestId('callback-success-close').click();
    await expect(page.getByTestId('callback-success')).toHaveCount(0);
  });
});
