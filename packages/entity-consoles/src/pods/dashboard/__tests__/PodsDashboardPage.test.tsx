import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../../__tests__/testkit';
import PodsDashboardPage from '../PodsDashboardPage';
import { POD_DASHBOARD } from '../queries';

// The shared grid drives GridStack, which needs a layout engine jsdom lacks and
// a saved-layout query of its own. Render the header and each widget's content
// in order so the page's own wiring is what is under test.
vi.mock('@duncit/dashboard', () => ({
  DuncitDashboard: ({
    header,
    widgets,
  }: {
    header?: ReactNode;
    widgets: readonly { id: string; content: ReactNode }[];
  }) => (
    <div>
      {header}
      {widgets.map((widget) => (
        <section key={widget.id} data-testid={`widget-${widget.id}`}>
          {widget.content}
        </section>
      ))}
    </div>
  ),
}));

// The chart's canvas path throws under jsdom; its own suite covers the data.
vi.mock('react-chartjs-2', () => ({
  Bar: (props: { data: { labels: string[] } }) => <div data-testid="chart">{props.data.labels.length} bars</div>,
}));

const pod = (id: string, title: string, rating: number | null) => ({
  __typename: 'PodDashboardPod',
  id,
  pod_id: `DUN-POD-${id}`,
  title,
  starts_at: '2026-10-04T12:30:00.000Z',
  spots: 12,
  filled: 9,
  rating_average: rating,
  rating_count: rating === null ? 0 : 18,
});

const board = (days: number, over: Record<string, unknown> = {}) => ({
  __typename: 'PodDashboard',
  days,
  totals: {
    __typename: 'PodDashboardTotals',
    total: 42,
    upcoming: 12,
    completed: 20,
    cancelled: 3,
    awaiting_venue: 5,
    live_today: 2,
  },
  seats: { __typename: 'PodDashboardSeats', spots_total: 1200, seats_filled: 900, occupancy_pct: 75 },
  money: {
    __typename: 'PodDashboardMoney',
    revenue_total: 412345,
    payments_count: 318,
    refunded_total: 1200,
    average_ticket: 1296,
  },
  ratings: {
    __typename: 'PodDashboardRatings',
    total: 64,
    overall_average: 4.26,
    aspects: [{ __typename: 'PodDashboardAspect', aspect: 'PARKING', average: 3.5, count: 12 }],
  },
  top_rated: [pod('1', 'Sunday board games', 4.8)],
  needs_attention: [pod('2', 'Rooftop salsa', 2.9)],
  upcoming: [pod('3', 'Lakeside run club', null)],
  created_trend: [{ __typename: 'PodDashboardTrendDay', date: '2026-09-13T12:00:00.000Z', count: 4 }],
  ...over,
});

const dashboardMock = (days: number, data: Record<string, unknown>): MockedResponse => ({
  request: { query: POD_DASHBOARD, variables: { days } },
  result: { data: { podDashboard: data } },
});

describe('PodsDashboardPage', () => {
  it('shows loading placeholders, then fills every widget from the 30-day board', async () => {
    renderWithProviders(<PodsDashboardPage />, { mocks: [dashboardMock(30, board(30))] });

    expect(screen.getByText('Pods dashboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('widget-tiles')).getAllByText('…')).toHaveLength(10);
    expect(screen.getByText('Loading pod activity…')).toBeInTheDocument();
    expect(screen.getByText('No ratings in the last 30 days')).toBeInTheDocument();
    expect(screen.getByText('No pod has been rated yet.')).toBeInTheDocument();
    expect(screen.getByText('Nothing is scoring badly.')).toBeInTheDocument();
    expect(screen.getByText('No upcoming pods.')).toBeInTheDocument();

    expect(await screen.findByText('64 ratings in the last 30 days')).toBeInTheDocument();
    expect(within(screen.getByTestId('widget-tiles')).getByText('42')).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toHaveTextContent('1 bars');
    expect(screen.getByText('PARKING')).toBeInTheDocument();
    expect(within(screen.getByTestId('widget-best-rated')).getByRole('link')).toHaveTextContent(
      'Sunday board games',
    );
    expect(within(screen.getByTestId('widget-needs-attention')).getByRole('link')).toHaveTextContent(
      'Rooftop salsa',
    );
    expect(within(screen.getByTestId('widget-starting-next')).getByText('9/12')).toBeInTheDocument();
  });

  it('re-reads the board for the period picked and ignores a click on the period already selected', async () => {
    renderWithProviders(<PodsDashboardPage />, {
      mocks: [dashboardMock(30, board(30)), dashboardMock(7, board(7, { ratings: null }))],
    });
    await screen.findByText('64 ratings in the last 30 days');

    fireEvent.click(screen.getByRole('button', { name: '30 days' }));
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '7 days' }));
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('No ratings in the last 7 days')).toBeInTheDocument();
    expect(screen.queryByText('PARKING')).not.toBeInTheDocument();
  });

  it('shows the error message above the widgets when the board cannot be read', async () => {
    renderWithProviders(<PodsDashboardPage />, {
      mocks: [
        {
          request: { query: POD_DASHBOARD, variables: { days: 30 } },
          result: { errors: [new GraphQLError('Dashboard is unavailable')] },
        },
      ],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Dashboard is unavailable');
  });
});
