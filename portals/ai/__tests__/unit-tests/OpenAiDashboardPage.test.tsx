import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import OpenAiDashboardPage from '../../src/pages/openai-dashboard';
import {
  OPENAI_USAGE_DASHBOARD,
  type UsageDashboardData,
} from '../../src/pages/openai-dashboard/queries';
import { renderWithProviders } from '../testkit';

vi.mock('@duncit/table', () => import('./table-mock'));

/**
 * The OpenAI dashboard — "where is the bill going, over which window".
 *
 * The range select is the whole point of the page: every figure on it is
 * scoped to that window, so changing it has to refetch rather than re-slice
 * something already on screen.
 */
vi.mock('@duncit/dashboard', () => ({
  DuncitDashboard: ({
    header,
    widgets,
  }: {
    header: React.ReactNode;
    widgets: { id: string; content: React.ReactNode }[];
  }) => (
    <div data-testid="dashboard">
      {header}
      {widgets.map((widget) => (
        <div key={widget.id} data-testid={'widget-' + widget.id}>
          {widget.content}
        </div>
      ))}
    </div>
  ),
}));

const data = (over: Partial<UsageDashboardData> = {}): UsageDashboardData =>
  ({
    __typename: 'OpenAiUsageDashboard',
    range_days: 7,
    total_calls: 412,
    success_calls: 400,
    failed_calls: 10,
    skipped_calls: 2,
    prompt_tokens: 400_000,
    completion_tokens: 115_000,
    total_tokens: 515_000,
    total_cost_usd: 1.24,
    avg_duration_ms: 1420,
    all_time_calls: 9_800,
    all_time_cost_usd: 42.5,
    by_task: [
      {
        task: 'pod.describe',
        label: 'Describe a pod',
        module: 'Pods',
        calls: 412,
        tokens: 515_000,
        cost_usd: 1.24,
        failures: 0,
        avg_duration_ms: 1420,
      },
    ],
    by_module: [{ key: 'Pods', calls: 412, tokens: 515_000, cost_usd: 1.24 }],
    by_model: [{ key: 'gpt-4o-mini', calls: 412, tokens: 515_000, cost_usd: 1.24 }],
    series: [{ date: '2026-09-01', calls: 412, tokens: 515_000, cost_usd: 1.24 }],
    unpriced_models: [],
    prices: [
      {
        id: 'p-1',
        model: 'gpt-4o-mini',
        input_per_1m: 0.15,
        output_per_1m: 0.6,
        updated_at: '2026-09-01T10:00:00.000Z',
      },
    ],
    ...over,
  }) as UsageDashboardData;

const dashMock = (rangeDays: number, over: Partial<UsageDashboardData> = {}): MockedResponse => ({
  request: { query: OPENAI_USAGE_DASHBOARD, variables: { range_days: rangeDays } },
  result: { data: { openAiUsageDashboard: data({ range_days: rangeDays, ...over }) } },
  maxUsageCount: 5,
});

describe('OpenAiDashboardPage', () => {
  it('shows the header while the first load is still in flight', () => {
    renderWithProviders(<OpenAiDashboardPage />, { mocks: [dashMock(7)] });

    // The range control has to be usable before the numbers arrive, or the
    // page looks broken for the length of a slow query.
    expect(screen.getByText('OpenAI Dashboard')).toBeInTheDocument();
  });

  it('renders the spend once the range has loaded', async () => {
    renderWithProviders(<OpenAiDashboardPage />, { mocks: [dashMock(7)] });

    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
    expect(screen.getByText('Describe a pod')).toBeInTheDocument();
  });

  it('refetches against the new window when the range changes', async () => {
    renderWithProviders(<OpenAiDashboardPage />, {
      mocks: [
        dashMock(7),
        dashMock(30, {
          by_task: [
            {
              task: 'club.suggest',
              label: 'Suggest a club',
              module: 'Clubs',
              calls: 20,
              tokens: 9_000,
              cost_usd: 0.04,
              failures: 3,
              avg_duration_ms: 900,
            },
          ],
        }),
      ],
    });

    await screen.findByTestId('dashboard');
    fireEvent.mouseDown(screen.getByLabelText('Range'));
    fireEvent.click(within(await screen.findByRole('listbox')).getByText('Last 30 days'));

    // Every figure is scoped to the window, so the answer must come from the
    // server rather than from what is already on screen.
    expect(await screen.findByText('Suggest a club')).toBeInTheDocument();
  });

  it('stays quiet about pricing when every model has a rate card', async () => {
    renderWithProviders(<OpenAiDashboardPage />, { mocks: [dashMock(7)] });

    await screen.findByTestId('dashboard');
    expect(screen.queryByText(/no rate card/i)).not.toBeInTheDocument();
  });

  it('names the models it cannot price', async () => {
    renderWithProviders(<OpenAiDashboardPage />, {
      mocks: [dashMock(7, { unpriced_models: ['gpt-5-preview', 'o3-mini'] })],
    });

    await screen.findByTestId('dashboard');
    // Without this the totals silently understate the bill.
    expect(screen.getByText(/gpt-5-preview/)).toBeInTheDocument();
    expect(screen.getByText(/o3-mini/)).toBeInTheDocument();
  });

  it('shows the header alone when the range came back with no dashboard at all', async () => {
    renderWithProviders(<OpenAiDashboardPage />, {
      mocks: [
        {
          request: { query: OPENAI_USAGE_DASHBOARD, variables: { range_days: 7 } },
          result: { data: { openAiUsageDashboard: null } },
        },
      ],
    });

    // Neither loading nor an error, just nothing — the range control has to
    // survive so the reader can pick a window that does have data.
    await waitFor(() => expect(screen.getByLabelText('Range')).toBeInTheDocument());
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('surfaces a failed load rather than an empty page', async () => {
    renderWithProviders(<OpenAiDashboardPage />, {
      mocks: [
        {
          request: { query: OPENAI_USAGE_DASHBOARD, variables: { range_days: 7 } },
          error: new Error('dashboard unavailable'),
        },
      ],
    });

    await waitFor(() => expect(screen.getByText(/dashboard unavailable/i)).toBeInTheDocument());
  });
});
