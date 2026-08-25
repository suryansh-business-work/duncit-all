import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import DashboardPage from '../../src/pages/DashboardPage';
import FinanceKpis from '../../src/pages/finance/dashboard/FinanceKpis';
import { renderWithProviders } from '../testkit';
import {
  financeDashboardErrorMock,
  financeDashboardLoadingMock,
  financeDashboardStatsMock,
  makeFinanceDashboardStats,
  makeFinanceStat,
} from '../mocks/dashboard.mock';

describe('FinanceKpis', () => {
  it('renders an error alert', async () => {
    renderWithProviders(<FinanceKpis />, { mocks: [financeDashboardErrorMock()] });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('shows loading placeholders and a blank currency while fetching', () => {
    renderWithProviders(<FinanceKpis />, { mocks: [financeDashboardLoadingMock()] });
    // Pending query: no data yet → each card shows the loading placeholder and 0.00.
    expect(screen.getByText('Duncit Revenue')).toBeInTheDocument();
    expect(screen.getAllByTestId('stat-loading').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0.00').length).toBeGreaterThan(0);
  });

  it('renders KPI cards with up and down trends once loaded', async () => {
    renderWithProviders(<FinanceKpis />, { mocks: [financeDashboardStatsMock()] });
    expect(await screen.findByText('+5.0% vs last month')).toBeInTheDocument();
    expect(screen.getByText('-3.0% vs last month')).toBeInTheDocument();
    expect(screen.getByText('Total Collected (GMV)')).toBeInTheDocument();
  });

  /**
   * Every other tile is revenue, where up is the win. Pod spend is the one that
   * reads the other way, so it gets the trend colour on the opposite rule —
   * green when it falls, red when it climbs.
   */
  it('greens a FALL in pod spend and reds a rise', async () => {
    const { unmount } = renderWithProviders(<FinanceKpis />, {
      mocks: [financeDashboardStatsMock()],
    });
    expect(await screen.findByText('Pod Expenses')).toBeInTheDocument();
    expect(screen.getByText('-8.0% vs last month')).toHaveAttribute(
      'data-hint-color',
      'success.main',
    );
    unmount();

    renderWithProviders(<FinanceKpis />, {
      mocks: [
        financeDashboardStatsMock(
          makeFinanceDashboardStats({
            pod_expenses: makeFinanceStat({ total: 300, mom_change_pct: 12 }),
          }),
        ),
      ],
    });
    expect(await screen.findByText('+12.0% vs last month')).toHaveAttribute(
      'data-hint-color',
      'error.main',
    );
  });
});

describe('DashboardPage', () => {
  it('renders the welcome dashboard with the KPI section', async () => {
    renderWithProviders(<DashboardPage />, { mocks: [financeDashboardStatsMock()] });
    expect(screen.getByTestId('welcome-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Finance overview')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Total Collected (GMV)')).toBeInTheDocument());
  });
});
