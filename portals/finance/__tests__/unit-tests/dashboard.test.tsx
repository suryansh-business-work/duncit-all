import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { useQuery } from '@apollo/client';
import DashboardPage from '../../src/pages/DashboardPage';
import FinanceKpis from '../../src/pages/finance/dashboard/FinanceKpis';
import { renderUI } from './testkit';

vi.mock('@apollo/client', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, useQuery: vi.fn() };
});

const mockedUseQuery = vi.mocked(useQuery);

const stat = (total: number, mom: number) => ({ total, this_month: 0, last_month: 0, mom_change_pct: mom });

describe('FinanceKpis', () => {
  beforeEach(() => mockedUseQuery.mockReset());

  it('renders an error alert', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, loading: false, error: new Error('boom') } as any);
    renderUI(<FinanceKpis />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders KPI cards with up/down trends and handles missing stats', () => {
    mockedUseQuery.mockReturnValue({
      loading: true,
      error: undefined,
      data: {
        financeDashboardStats: {
          currency_symbol: '₹',
          total_revenue: stat(1000, 5),
          duncit_revenue: stat(500, -3),
          gst_collected: stat(100, 0),
          // pending_payouts + completed_payouts intentionally missing → undefined stat
        },
      },
    } as any);
    renderUI(<FinanceKpis />);
    expect(screen.getByText('Total Collected (GMV)')).toBeInTheDocument();
    expect(screen.getByText('+5.0% vs last month')).toBeInTheDocument();
    expect(screen.getByText('-3.0% vs last month')).toBeInTheDocument();
    // missing stat → value defaults to ₹0.00 and shows a loading placeholder
    expect(screen.getAllByText('₹0.00').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('stat-loading').length).toBeGreaterThan(0);
  });

  it('renders with no data (empty currency symbol)', () => {
    mockedUseQuery.mockReturnValue({ loading: false, error: undefined, data: undefined } as any);
    renderUI(<FinanceKpis />);
    expect(screen.getByText('Duncit Revenue')).toBeInTheDocument();
  });
});

describe('DashboardPage', () => {
  beforeEach(() => mockedUseQuery.mockReset());

  it('renders the welcome dashboard with the KPI section', () => {
    mockedUseQuery.mockReturnValue({ loading: false, error: undefined, data: undefined } as any);
    renderUI(<DashboardPage />);
    expect(screen.getByTestId('welcome-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Finance overview')).toBeInTheDocument();
  });
});
