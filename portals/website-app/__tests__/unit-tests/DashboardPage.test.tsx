import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, waitFor } from '@testing-library/react';
import { DashboardPage } from '../../src/pages/website';
import { WEBSITE_CONTENT } from '../../src/pages/website/content/queries';
import { NEWSLETTER_SUBSCRIBERS } from '../../src/pages/website/newsletter/queries';
import { CONTACT_SUBMISSIONS } from '../../src/pages/website/contact-submissions/queries';
import { FAQ_SUBMISSIONS } from '../../src/pages/website/faq-submissions/queries';
import { renderWithProviders } from './testkit';

const userMock = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => ({ user: userMock.value }),
}));

const q = (query: unknown, key: string, rows: unknown[]): MockedResponse => ({
  request: { query: query as MockedResponse['request']['query'] },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { [key]: rows } },
});

const dataMocks: MockedResponse[] = [
  q(WEBSITE_CONTENT, 'websiteContent', [
    { id: '1', type: 'CAREERS' },
    { id: '2', type: 'NEWSROOM' },
    { id: '3', type: 'BLOG' },
    { id: '4', type: 'BLOG' },
  ]),
  q(NEWSLETTER_SUBSCRIBERS, 'newsletterSubscribers', [
    { id: 's1', unsubscribed_at: null },
    { id: 's2', unsubscribed_at: '2026-01-01' },
  ]),
  q(CONTACT_SUBMISSIONS, 'contactSubmissions', [
    { id: 'c1', status: 'NEW' },
    { id: 'c2', status: 'RESOLVED' },
  ]),
  q(FAQ_SUBMISSIONS, 'faqSubmissions', [
    { id: 'f1', status: 'NEW' },
    { id: 'f2', status: 'IGNORED' },
  ]),
];

afterEach(() => {
  userMock.value = null;
});

describe('DashboardPage', () => {
  it('counts content by type and submissions, greeting by first name', async () => {
    userMock.value = { first_name: 'Sam', full_name: 'Sam Fuller' };
    renderWithProviders(<DashboardPage />, { mocks: dataMocks });
    expect(await screen.findByText(/Hi Sam, welcome back/)).toBeInTheDocument();
    // Career=1, Newsroom=1, Blog=2, Newsletter total=2 (1 active), Contact=2 (1 new), FAQ=2 (1 new)
    await waitFor(() => expect(screen.getByText('1 active')).toBeInTheDocument());
    // Contact + FAQ both show "1 new".
    expect(screen.getAllByText('1 new')).toHaveLength(2);
  });

  it('falls back to full_name when there is no first name', async () => {
    userMock.value = { full_name: 'Full Only' };
    renderWithProviders(<DashboardPage />, { mocks: dataMocks });
    expect(await screen.findByText(/Hi Full Only, welcome back/)).toBeInTheDocument();
  });

  it('greets "there" and shows zero counts when data is absent', async () => {
    userMock.value = null;
    renderWithProviders(<DashboardPage />, { mocks: [] });
    expect(await screen.findByText(/Hi there, welcome back/)).toBeInTheDocument();
    // With no query data the `?? []` fallbacks yield "0 active"/"0 new".
    await waitFor(() => expect(screen.getByText('0 active')).toBeInTheDocument());
    expect(screen.getAllByText('0 new')).toHaveLength(2);
  });
});
