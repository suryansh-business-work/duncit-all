/**
 * Finance > Duncit Coin > Dashboard — how many coins the platform has granted,
 * how many were spent, what is still outstanding, and month by month.
 *
 * jsdom has no canvas, so chart.js can never draw; the Bar is swapped for a
 * probe that shows what the page hands it — the month labels and the two
 * series — which is the part this page owns.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { CoinDashboardPage } from '../../src/pages/finance/duncit-coin';
import CoinMonthlyChart from '../../src/pages/finance/duncit-coin/CoinMonthlyChart';
import { renderWithProviders } from '../testkit';
import { dashboardLayoutMock } from '../mocks/dashboard-layout.mock';
import { coinStatsErrorMock, coinStatsMock, makeCoinMonth, makeCoinStats } from '../mocks/coin.mock';

vi.mock('react-chartjs-2', () => ({
  Bar: ({ data }: { data: { labels: string[]; datasets: { label: string; data: number[] }[] } }) => (
    <div data-testid="bar-chart">
      <span data-testid="bar-labels">{data.labels.join(' | ')}</span>
      {data.datasets.map((set) => (
        <span key={set.label} data-testid={`bar-series-${set.label}`}>
          {set.data.join(',')}
        </span>
      ))}
    </div>
  ),
}));

const tileValue = (label: string) => {
  const tile = screen.getAllByTestId('stat-card').find((card) => within(card).queryByText(label));
  return within(tile as HTMLElement).getByTestId('stat-value').textContent;
};

describe('CoinDashboardPage', () => {
  it('shows the headline tiles and the month-by-month chart for the last 12 months', async () => {
    renderWithProviders(<CoinDashboardPage />, {
      mocks: [coinStatsMock(12), dashboardLayoutMock('finance.coin')],
    });
    expect(await screen.findByRole('heading', { name: 'Duncit Coin' })).toBeInTheDocument();
    await waitFor(() => expect(tileValue('Coins Circulated')).toBe('5,000'));
    expect(tileValue('Pod Join Earn')).toBe('5%');
    expect(screen.getByTestId('bar-labels')).toHaveTextContent('Jul 26 | Aug 26');
    expect(screen.getByTestId('bar-series-Earned')).toHaveTextContent('900,1100');
    expect(screen.getByTestId('bar-series-Redeemed')).toHaveTextContent('150,300');
    // The ledger and the balances agree, so there is nothing to warn about.
    expect(screen.queryByText(/The ledger says/)).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Period' })).toHaveTextContent('Last 12 months');
  });

  it('says so out loud when the ledger and the user balances disagree', async () => {
    renderWithProviders(<CoinDashboardPage />, {
      mocks: [
        coinStatsMock(12, makeCoinStats({ total_outstanding: 3800, wallet_balance_total: 3900 })),
        dashboardLayoutMock('finance.coin'),
      ],
    });
    expect(
      await screen.findByText(/The ledger says 3,800 coins are outstanding, but user\s+balances add up to 3,900/),
    ).toBeInTheDocument();
    expect(screen.getByText(/a gap of 100\./)).toBeInTheDocument();
  });

  it('re-reads the stats for the period picked', async () => {
    renderWithProviders(<CoinDashboardPage />, {
      mocks: [
        coinStatsMock(12),
        coinStatsMock(24, makeCoinStats({ total_circulated: 9100 })),
        dashboardLayoutMock('finance.coin'),
      ],
    });
    await waitFor(() => expect(tileValue('Coins Circulated')).toBe('5,000'));

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Period' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Last 24 months' }));

    await waitFor(() => expect(tileValue('Coins Circulated')).toBe('9,100'));
    expect(screen.getByRole('combobox', { name: 'Period' })).toHaveTextContent('Last 24 months');
  });

  it('shows the error and empty tiles when the stats cannot be read', async () => {
    renderWithProviders(<CoinDashboardPage />, {
      mocks: [coinStatsErrorMock(), dashboardLayoutMock('finance.coin')],
    });
    expect(await screen.findByText('coin stats unavailable')).toBeInTheDocument();
    expect(tileValue('Coins Circulated')).toBe('—');
    expect(screen.getByText('No coin activity in this period yet.')).toBeInTheDocument();
    // With no stats there is no configured symbol yet.
    expect(screen.getByText(/1 coin = 1 ₹ of reward value/)).toBeInTheDocument();
  });
});

describe('CoinMonthlyChart', () => {
  it('says it is loading while there is nothing to draw yet', () => {
    renderWithProviders(<CoinMonthlyChart buckets={[]} loading />);
    expect(screen.getByText('Loading coin activity…')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('treats a period of all-zero months as empty', () => {
    renderWithProviders(
      <CoinMonthlyChart buckets={[makeCoinMonth('2026-07', 0, 0)]} loading={false} />,
    );
    expect(screen.getByText('No coin activity in this period yet.')).toBeInTheDocument();
  });

  it('draws a period that only saw coins spent', () => {
    renderWithProviders(
      <CoinMonthlyChart
        buckets={[makeCoinMonth('2026-06', 0, 0), makeCoinMonth('2026-07', 0, 40)]}
        loading={false}
      />,
    );
    expect(screen.getByTestId('bar-labels')).toHaveTextContent('Jun 26 | Jul 26');
    expect(screen.getByTestId('bar-series-Redeemed')).toHaveTextContent('0,40');
  });
});
