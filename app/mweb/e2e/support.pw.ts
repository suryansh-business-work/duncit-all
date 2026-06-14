import { test, expect } from '@playwright/test';
import { mockGraphql, blockThirdParty } from './support/gql';
import { seedAuth } from './support/auth';
import { bootFixtures, podDetailFixtures, past } from './support/data';

const unifiedRows = [
  { id: 't1', ticket_no: 'ST-AAA111', title: 'Refund issue', status: 'OPEN', source: 'TICKET', created_at: new Date().toISOString() },
  { id: 's1', ticket_no: 'SOS-BBB222', title: 'Help', status: 'RESOLVED', source: 'SOS', created_at: new Date().toISOString() },
  { id: 'c1', ticket_no: 'CB-CCC333', title: 'Call me', status: 'PENDING', source: 'CALLBACK', created_at: new Date().toISOString() },
  { id: 'h1', ticket_no: 'CH-DDD444', title: 'Hi there', status: 'OPEN', source: 'CHAT', created_at: new Date().toISOString() },
];

test.describe('Support module', () => {
  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await seedAuth(page);
  });

  test('hub shows the renamed sections and no Live Feedback (bugs 1.3-1.6)', async ({ page }) => {
    await mockGraphql(page, bootFixtures);
    await page.goto('/support');
    await expect(page.getByText('Chat with Us')).toBeVisible();
    await expect(page.getByText('Create Support Tickets')).toBeVisible();
    await expect(page.getByText('All Support Tickets')).toBeVisible();
    await expect(page.getByText('Live Feedback')).toHaveCount(0);
    await expect(page.getByText('Live Tickets')).toHaveCount(0);
  });

  test('the native /support/chat path resolves instead of 404ing (BUG-02)', async ({ page }) => {
    await mockGraphql(page, bootFixtures);
    await page.goto('/support/chat');
    // Redirects to the canonical Chat-with-Us route rather than the 404 page.
    await expect(page).toHaveURL(/\/support\/live/);
    await expect(page.getByText('Page not found')).toHaveCount(0);
  });

  test('callback request needs no pod selection (bug 1.2)', async ({ page }) => {
    await mockGraphql(page, {
      ...bootFixtures,
      SupportCallTarget: { bouncerSupportTarget: { phone: '+91123', label: 'Support' } },
    });
    await page.goto('/support/callback');
    await expect(page.getByText('Callback Request').first()).toBeVisible();
    // The pod picker is gone — no pod dropdown on this page.
    await expect(page.getByText(/Select a pod|Choose a pod/i)).toHaveCount(0);
  });

  test('All Support Tickets lists every category with prefixed ids (bug 1.6)', async ({ page }) => {
    await mockGraphql(page, {
      ...bootFixtures,
      MyUnifiedSupportTickets: { myUnifiedSupportTickets: unifiedRows },
    });
    await page.goto('/support/all');
    await expect(page.getByText('ST-AAA111')).toBeVisible();
    await expect(page.getByText('SOS-BBB222')).toBeVisible();
    await expect(page.getByText('CB-CCC333')).toBeVisible();
    await expect(page.getByText('CH-DDD444')).toBeVisible();
    await expect(page.getByText('Callback Request', { exact: true })).toBeVisible();
  });

  test('creating a ticket redirects to its details page (bug 1.4)', async ({ page }) => {
    await mockGraphql(page, {
      ...bootFixtures,
      CreateMyTicket: { createTicket: { id: 'tk9', subject: 'Broken page', status: 'OPEN', category: 'TECHNICAL', created_at: new Date().toISOString() } },
      MyTicket: {
        ticket: {
          id: 'tk9', subject: 'Broken page', category: 'TECHNICAL', status: 'OPEN', priority: 'NORMAL',
          assignee_id: null, assignee_name: null, last_message_at: new Date().toISOString(),
          message_count: 1, messages: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          user: { id: 'u1', name: 'Test User', phone: null, avatar_url: null },
        },
      },
    });
    await page.goto('/support/tickets');
    await page.getByLabel('Subject').fill('Broken page');
    await page.getByLabel("Tell us what's going on").fill('The page crashes when I tap save.');
    // A floating overlay (community FAB) hovers above the submit on mobile
    // viewports — force the click through it.
    await page.getByRole('button', { name: 'Send to support' }).dispatchEvent('click');
    await expect(page).toHaveURL(/\/tickets\/tk9/);
  });

  test('policy page offers View + Download PDF (other bug 2)', async ({ page }) => {
    await mockGraphql(page, {
      ...bootFixtures,
      PolicyBySlug: {
        policyBySlug: {
          id: 'p1', slug: 'privacy-policy', title: 'Privacy Policy',
          content: '<p>We respect your privacy.</p>', is_active: true,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        },
      },
    });
    await page.goto('/policies/privacy-policy');
    await expect(page.getByRole('button', { name: 'View PDF' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible();
  });

  test('an expired pod blocks checkout (other bug 3)', async ({ page }) => {
    await mockGraphql(page, podDetailFixtures({ pod_date_time: past(2) }));
    await page.goto('/club/jazz-club/pod/sunset-jam');
    await expect(page.getByText(/already taken place — booking is closed/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Join/ })).toHaveCount(0);
  });

  test('the pod map renders via the keyless embed (other bug 4)', async ({ page }) => {
    await mockGraphql(page, podDetailFixtures());
    await page.goto('/club/jazz-club/pod/sunset-jam');
    const iframe = page.locator('iframe[title="Pod location map"]');
    await expect(iframe).toHaveAttribute('src', /output=embed/);
    await expect(iframe).not.toHaveAttribute('src', /maps\/embed\/v1/);
  });
});
