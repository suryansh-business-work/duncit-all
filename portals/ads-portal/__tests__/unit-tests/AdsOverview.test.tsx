import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import AdsOverview from '../../src/pages/dashboard/AdsOverview';
import type { AdsDashboardStats } from '../../src/pages/dashboard/queries';
import { renderWithProviders } from './testkit';

const q = vi.hoisted(() => ({
  value: { data: undefined as unknown, loading: false, error: undefined as unknown },
}));
vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useQuery: () => q.value,
}));

vi.mock('@duncit/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/ui')>()),
  QueryGuard: ({
    loading,
    notFound,
    children,
  }: {
    loading?: boolean;
    notFound?: boolean;
    children: ReactNode | (() => ReactNode);
  }) => (
    <div data-testid="guard" data-loading={String(!!loading)} data-notfound={String(!!notFound)}>
      {typeof children === 'function' ? children() : children}
    </div>
  ),
}));

vi.mock('../../src/pages/dashboard/StatGrid', () => ({
  default: () => <div data-testid="stat-grid" />,
}));
vi.mock('../../src/pages/dashboard/RecentAdsTable', () => ({
  default: () => <div data-testid="recent-table" />,
}));

const baseStats: AdsDashboardStats = {
  total: 5,
  pending: 1,
  approved: 1,
  live: 2,
  rejected: 0,
  expired: 1,
  total_estimated_cost: 20000,
  total_approved_cost: 18000,
  live_spend: 6000,
  next_start_at: '2026-08-01T09:00:00.000Z',
  next_start_title: 'Diwali Blast',
  currency_symbol: '₹',
};

afterEach(() => {
  q.value = { data: undefined, loading: false, error: undefined };
});

describe('AdsOverview', () => {
  it('renders the overview with a next-start hint and recent requests', () => {
    q.value = { data: { myAdsDashboard: baseStats }, loading: false, error: undefined };
    renderWithProviders(<AdsOverview />);
    expect(screen.getByText('Ads overview')).toBeInTheDocument();
    expect(screen.getByText('Diwali Blast')).toBeInTheDocument();
    expect(screen.getByTestId('stat-grid')).toBeInTheDocument();
    expect(screen.getByText('Recent requests')).toBeInTheDocument();
    expect(screen.getByTestId('recent-table')).toBeInTheDocument();
  });

  it('shows the empty state and no hint for a brand-new advertiser', () => {
    q.value = {
      data: { myAdsDashboard: { ...baseStats, total: 0, next_start_at: null } },
      loading: false,
      error: undefined,
    };
    renderWithProviders(<AdsOverview />);
    expect(screen.getByText('No ads yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create your first ad/i })).toBeInTheDocument();
    expect(screen.queryByTestId('recent-table')).not.toBeInTheDocument();
  });

  it('renders nothing in the body while loading with no stats yet', () => {
    q.value = { data: undefined, loading: true, error: undefined };
    renderWithProviders(<AdsOverview />);
    expect(screen.getByTestId('guard')).toHaveAttribute('data-loading', 'true');
    expect(screen.queryByText('Ads overview')).not.toBeInTheDocument();
  });
});
