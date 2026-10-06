import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import { makeSocialAccount } from '../mocks';

// The admin-zone clock: a fixed "now" and a day key read straight off the ISO
// instant, so the calendar the page opens on is deterministic on any machine.
const clock = vi.hoisted(() => ({
  now: () => new Date('2026-09-15T08:00:00.000Z'),
  dayKey: (value: Date | string) => (typeof value === 'string' ? value : value.toISOString()).slice(0, 10),
  formatTime: (value: string) => `at ${value.slice(11, 16)}`,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => clock,
}));

import { SOCIAL_POST, SOCIAL_SETUP, type SocialAccount } from '../../src/pages/social-accounts-page/queries';
import { SOCIAL_CALENDAR, type SocialCalendarItem } from '../../src/pages/social-accounts-page/publish.queries';
import { gridRange, monthWeeks } from '../../src/pages/social-accounts-page/publish/calendar-grid';
import SocialCalendarPage from '../../src/pages/social-calendar-page';

afterEach(() => {
  vi.clearAllMocks();
});

const NO_ACCOUNTS_COPY =
  'No social account is connected yet. Connect Instagram, Facebook or LinkedIn to start posting.';

const setupMock = (accounts: SocialAccount[]): MockedResponse => ({
  request: { query: SOCIAL_SETUP },
  result: {
    data: {
      socialProviders: [{ __typename: 'SocialProviderStatus', provider: 'LINKEDIN', configured: true }],
      socialAccounts: accounts.map((account) => ({ __typename: 'SocialAccount', ...account })),
    },
  },
});

const setupErrorMock = (message: string): MockedResponse => ({
  request: { query: SOCIAL_SETUP },
  result: { errors: [new GraphQLError(message)] },
});

const calendarMock = (items: SocialCalendarItem[] = []): MockedResponse => ({
  request: { query: SOCIAL_CALENDAR, variables: gridRange(monthWeeks('2026-09')) },
  result: { data: { socialCalendar: items.map((item) => ({ __typename: 'SocialCalendarItem', ...item })) } },
});

const publishedItem: SocialCalendarItem = {
  id: 'np1',
  kind: 'PUBLISHED',
  at: '2026-09-10T09:00:00.000Z',
  status: 'PUBLISHED',
  text: 'Sunday run recap',
  media_url: null,
  permalink: null,
  platforms: ['LINKEDIN'],
  account_names: ['Duncit Pages'],
  engagement: null,
};

const renderPage = (mocks: MockedResponse[]) => renderWithProviders(<SocialCalendarPage />, { mocks });

describe('SocialCalendarPage', () => {
  it('heads the page, loads the setup and shows the calendar without a connect prompt once accounts exist', async () => {
    renderPage([setupMock([makeSocialAccount()]), calendarMock()]);
    const page = screen.getByTestId('social-calendar-page');
    expect(within(page).getByRole('heading', { name: 'Social Calendar' })).toBeInTheDocument();
    expect(screen.getByTestId('social-calendar-connect')).toHaveTextContent('Connect accounts');
    expect(screen.getByTestId('social-publish')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryAllByRole('progressbar')).toHaveLength(0));
    expect(screen.queryByText(NO_ACCOUNTS_COPY)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a progress bar while the setup is loading', () => {
    renderPage([{ ...setupMock([]), delay: 10_000 }, calendarMock()]);
    // One bar for the setup and one for the calendar month, both still in flight.
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(NO_ACCOUNTS_COPY)).not.toBeInTheDocument();
  });

  it('says why the setup could not load and does not claim nothing is connected', async () => {
    renderPage([setupErrorMock('Social setup is down'), calendarMock()]);
    expect(await screen.findByText('Social setup is down')).toBeInTheDocument();
    expect(screen.queryByText(NO_ACCOUNTS_COPY)).not.toBeInTheDocument();
  });

  it('prompts to connect when no account is connected, and its action opens the accounts drawer', async () => {
    renderPage([setupMock([]), calendarMock()]);
    const prompt = await screen.findByText(NO_ACCOUNTS_COPY);
    const alert = prompt.closest('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(screen.queryByTestId('social-calendar-accounts')).not.toBeInTheDocument();

    fireEvent.click(within(alert as HTMLElement).getByRole('button', { name: 'Connect accounts' }));
    const drawer = await screen.findByTestId('social-calendar-accounts');
    expect(within(drawer).getByRole('heading', { name: 'Connected accounts' })).toBeInTheDocument();
  });

  it('opens the connect drawer from the header and closes it again', async () => {
    renderPage([setupMock([makeSocialAccount()]), calendarMock()]);
    fireEvent.click(screen.getByTestId('social-calendar-connect'));
    const drawer = await screen.findByTestId('social-calendar-accounts');
    expect(await within(drawer).findByText('Duncit Pages')).toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('social-calendar-accounts')).not.toBeInTheDocument());
  });

  it('opens the composer from Create post and closes it on Escape', async () => {
    renderPage([setupMock([makeSocialAccount()]), calendarMock()]);
    fireEvent.click(screen.getByTestId('social-create-post'));
    const dialog = await screen.findByRole('dialog', { name: 'Create post' });

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Create post' })).not.toBeInTheDocument());
  });

  it('opens a network post picked on the calendar in the post drawer and closes it', async () => {
    renderPage([
      setupMock([makeSocialAccount()]),
      calendarMock([publishedItem]),
      { request: { query: SOCIAL_POST, variables: { id: 'np1' } }, result: { errors: [new GraphQLError('Post is gone')] } },
    ]);
    expect(screen.queryByTestId('social-post-detail')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByTestId('social-calendar-item-np1'));
    const drawer = await screen.findByTestId('social-post-detail');
    expect(await within(drawer).findByText('Post is gone')).toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('social-post-detail')).not.toBeInTheDocument());
  });
});
