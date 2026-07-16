import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import AdsOverview from '../../src/pages/dashboard/AdsOverview';
import { makeAdsDashboard, myAdsDashboardMock } from '../mocks';
import { renderWithProviders } from '../testkit';

// Render QueryGuard's children unconditionally so AdsOverview's own
// `stats ? <OverviewBody/> : null` fork is exercised on both sides (null while
// the query is loading, OverviewBody once the mocked response resolves).
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

describe('AdsOverview', () => {
  it('renders the overview with a next-start hint and recent requests', async () => {
    renderWithProviders(<AdsOverview />, { mocks: [myAdsDashboardMock()] });
    // First paint: still loading, so the `stats ? … : null` null branch runs.
    expect(screen.getByTestId('guard')).toHaveAttribute('data-loading', 'true');
    expect(screen.queryByText('Ads overview')).not.toBeInTheDocument();

    expect(await screen.findByText('Ads overview')).toBeInTheDocument();
    expect(screen.getByText('Diwali Blast')).toBeInTheDocument();
    expect(screen.getByTestId('stat-grid')).toBeInTheDocument();
    expect(screen.getByText('Recent requests')).toBeInTheDocument();
    expect(screen.getByTestId('recent-table')).toBeInTheDocument();
  });

  it('shows the empty state and no hint for a brand-new advertiser', async () => {
    renderWithProviders(<AdsOverview />, {
      mocks: [myAdsDashboardMock(makeAdsDashboard({ total: 0, next_start_at: null }))],
    });
    expect(await screen.findByText('No ads yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create your first ad/i })).toBeInTheDocument();
    expect(screen.queryByTestId('recent-table')).not.toBeInTheDocument();
  });
});
