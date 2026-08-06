import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import EmailsDashboardPage from '../../src/pages/emails-dashboard';
import {
  EMAIL_LOG_DASHBOARD,
  type EmailLogDashboardData,
} from '../../src/pages/emails-dashboard/queries';

const bucket = (key: string, count: number) => ({
  __typename: 'EmailLogCountBucket',
  key,
  count,
});

/**
 * 40 rows carrying 1,920 people: the campaign bcc batches are the whole reason
 * the two headline numbers have to be labelled apart.
 */
const dashboard = (over: Partial<EmailLogDashboardData> = {}) => ({
  __typename: 'EmailLogDashboard',
  range_days: 7,
  attempts: 40,
  recipients: 1920,
  sent: 30,
  skipped: 6,
  failed: 4,
  partially_refused: 2,
  silently_discarded: 0,
  not_delivered_reasons: [bucket('No provider configured', 18), bucket('Mailbox unavailable', 3)],
  not_delivered_templates: [bucket('', 12), bucket('welcome', 3)],
  repeat_failures: [
    {
      __typename: 'EmailLogFailingAddress',
      address: 'ops@duncit.test',
      failures: 5,
      last_reason: 'Mailbox unavailable',
      last_failed_at: '2026-08-05T10:00:00.000Z',
    },
    {
      __typename: 'EmailLogFailingAddress',
      address: 'nobody@duncit.test',
      failures: 2,
      last_reason: 'Domain not found',
      last_failed_at: null,
    },
  ],
  ...over,
});

const mock = (
  rangeDays: number,
  over: Partial<EmailLogDashboardData> = {},
): MockedResponse => ({
  request: { query: EMAIL_LOG_DASHBOARD, variables: { range_days: rangeDays } },
  result: { data: { emailLogDashboard: dashboard(over) } },
});

const renderPage = (mocks: MockedResponse[] = [mock(7)]) =>
  renderWithProviders(<EmailsDashboardPage />, { mocks });

/** Everything one StatCard rendered, so a value can be tied to its own label. */
const tileText = (label: string) =>
  screen.getByText(label).closest('.MuiCard-root')?.textContent ?? '';

describe('EmailsDashboardPage', () => {
  it('shows a spinner until the range has loaded', () => {
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('RECIPIENTS ADDRESSED')).not.toBeInTheDocument();
  });

  it('surfaces a failed query instead of an empty board', async () => {
    renderPage([
      {
        request: { query: EMAIL_LOG_DASHBOARD, variables: { range_days: 7 } },
        error: new Error('dashboard boom'),
      },
    ]);
    expect(await screen.findByText('dashboard boom')).toBeInTheDocument();
  });

  it('counts people in the recipients tile, not log rows', async () => {
    renderPage();
    await screen.findByText('RECIPIENTS ADDRESSED');
    // The server's recipient count, and nowhere near the row count it is
    // routinely mistaken for.
    expect(tileText('RECIPIENTS ADDRESSED')).toContain('1,920');
    expect(tileText('RECIPIENTS ADDRESSED')).not.toContain('40');
    expect(tileText('ATTEMPTS (LOG ROWS)')).toContain('40');
  });

  it('puts the partial refusals next to sent, where they undercut it', async () => {
    renderPage();
    await screen.findByText('SENT');
    expect(tileText('SENT')).toContain('30');
    expect(tileText('SENT')).toContain('2 refused for some of their addresses');
  });

  it('names the templateless sends instead of drawing a blank bar', async () => {
    renderPage();
    expect(
      await screen.findByText('Raw HTML send — campaign, transcript or release note'),
    ).toBeInTheDocument();
    expect(screen.getByText('welcome')).toBeInTheDocument();
    expect(screen.getByText('Why nothing went out')).toBeInTheDocument();
    expect(screen.getByText('No provider configured')).toBeInTheDocument();
  });

  it('lists a repeatedly failing address, and says so when the time is unknown', async () => {
    renderPage();
    expect(await screen.findByText('ops@duncit.test')).toBeInTheDocument();
    expect(screen.getByText('Domain not found')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('stays quiet about silent discards when there are none', async () => {
    renderPage();
    await screen.findByText('RECIPIENTS ADDRESSED');
    expect(screen.queryByText(/signature of a discarded send/)).not.toBeInTheDocument();
  });

  it('warns that the board is overstated when sends are silently discarded', async () => {
    renderPage([mock(7, { silently_discarded: 7 })]);
    expect(await screen.findByText(/^7 sends completed in under five milliseconds/))
      .toBeInTheDocument();
    expect(screen.getByText(/no-provider transport accepted these/)).toBeInTheDocument();
  });

  it('re-queries the new window when the operator changes the range', async () => {
    renderPage([
      mock(7),
      mock(30, {
        range_days: 30,
        recipients: 8800,
        partially_refused: 0,
        repeat_failures: [],
        not_delivered_templates: [],
      }),
    ]);
    await screen.findByText('RECIPIENTS ADDRESSED');

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Last 30 days' }));

    await waitFor(() => expect(tileText('RECIPIENTS ADDRESSED')).toContain('8,800'));
    expect(tileText('SENT')).toContain('0 refused for some of their addresses');
    expect(screen.getByText('No address failed more than once in this range.')).toBeInTheDocument();
  });
});
