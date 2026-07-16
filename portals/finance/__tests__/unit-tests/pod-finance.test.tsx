import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { useApolloClient, useQuery } from '@apollo/client';
import { PodFinancePage, PodFinanceDetailPage } from '../../src/pages/finance/pod-finance-page';
import SettlementStatusChip, { FrozenBadge } from '../../src/pages/finance/pod-finance-page/SettlementStatusChip';
import { resetTableControls } from './mocks/table';
import { renderUI, renderRoute } from './testkit';

vi.mock('@apollo/client', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, useQuery: vi.fn(), useApolloClient: vi.fn() };
});

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseApolloClient = vi.mocked(useApolloClient);

const releases = [
  { id: '1', pod_id: 'p1', pod_title: 'Alpha', kind: 'HOST_PAYMENT', status: 'PENDING', amount_requested: 100, requested_at: '2024-02-01' },
  { id: '2', pod_id: 'p1', pod_title: 'Alpha', kind: 'VENUE_BILLING', status: 'APPROVED', amount_requested: 50, requested_at: '2024-01-01' },
  { id: '3', pod_id: 'p2', pod_title: 'Beta', kind: 'HOST_PAYMENT', status: 'PENDING', amount_requested: 0, requested_at: 'bad-date' },
];

const waterfall = {
  version: 2, amount: 1000, gst_pct: 18, gst_amount: 150, net_amount: 850, platform_fee_pct: 5, platform_fee_amount: 42,
  pool_amount: 808, venue_amount: 400, venue_commission_pct: 10, venue_commission_amount: 40, venue_receives: 360,
  host_amount: 408, host_commission_pct: 10, host_commission_amount: 40, host_receives: 368, duncit_revenue: 122, host_earn_pct: 36.8,
};
const breakdownVenue = {
  pod_id: 'pod1', pod_title: 'Yoga', settlement_status: 'SETTLED', frozen: true, bookings_count: 10,
  collected_total: 1000, currency_symbol: '₹', has_venue: true, completed_at: '2024-01-05T00:00:00Z', waterfall,
};

beforeEach(() => {
  mockedUseQuery.mockReset();
  mockedUseApolloClient.mockReset().mockReturnValue({
    query: vi.fn().mockResolvedValue({ data: { paymentReleaseRequests: releases, publicFinanceSettings: { currency_symbol: '₹' } } }),
  } as any);
  resetTableControls();
});

describe('SettlementStatusChip', () => {
  it('labels each status and falls back for an unknown one', () => {
    const { rerender } = renderUI(<SettlementStatusChip status={'LIVE' as any} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    rerender(<SettlementStatusChip status={'PENDING_APPROVAL' as any} />);
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    rerender(<SettlementStatusChip status={'SETTLED' as any} />);
    expect(screen.getByText('Settled')).toBeInTheDocument();
    rerender(<SettlementStatusChip status={'WEIRD' as any} />);
    expect(screen.getByText('WEIRD')).toBeInTheDocument();
    rerender(<FrozenBadge />);
    expect(screen.getByText('Frozen snapshot')).toBeInTheDocument();
  });
});

describe('PodFinancePage', () => {
  it('groups releases into rows and navigates to a pod', async () => {
    renderRoute(<PodFinancePage />, {
      extra: <Route path="/pod-finance/:podId" element={<div data-testid="detail-probe">detail</div>} />,
    });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    expect(screen.getByText('Beta')).toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId('row-open')[0]);
    expect(screen.getByTestId('detail-probe')).toBeInTheDocument();
  });

  it('renders an empty table when the query returns no data', async () => {
    mockedUseApolloClient.mockReturnValue({
      query: vi.fn().mockResolvedValue({ data: { paymentReleaseRequests: null, publicFinanceSettings: null } }),
    } as any);
    renderRoute(<PodFinancePage />);
    await waitFor(() => expect(screen.getByText('No pods with payment activity yet.')).toBeInTheDocument());
  });
});

describe('PodFinanceDetailPage', () => {
  const renderDetail = () =>
    renderRoute(<PodFinanceDetailPage />, {
      path: '/pod-finance/:podId',
      entry: '/pod-finance/pod1',
      extra: <Route path="/pod-finance" element={<div data-testid="list-probe">list</div>} />,
    });

  it('shows the loading guard', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, loading: true, error: undefined } as any);
    renderDetail();
    expect(screen.getByTestId('qg-loading')).toBeInTheDocument();
  });

  it('renders a venue pod waterfall (frozen, completed) and navigates back', () => {
    mockedUseQuery.mockReturnValue({ data: { podFinanceBreakdown: breakdownVenue }, loading: false, error: undefined } as any);
    renderDetail();
    expect(screen.getByRole('heading', { name: 'Yoga' })).toBeInTheDocument();
    expect(screen.getByText('Frozen snapshot')).toBeInTheDocument();
    expect(screen.getByText('5. Venue Amount')).toBeInTheDocument();
    expect(screen.getByText('Host Earnings Summary')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to pod finance/i }));
    expect(screen.getByTestId('list-probe')).toBeInTheDocument();
  });

  it('renders a pod without a venue (no venue step, not frozen, not completed)', () => {
    mockedUseQuery.mockReturnValue({
      data: { podFinanceBreakdown: { ...breakdownVenue, has_venue: false, frozen: false, completed_at: null, settlement_status: 'LIVE' } },
      loading: false,
      error: undefined,
    } as any);
    renderDetail();
    expect(screen.queryByText('5. Venue Amount')).not.toBeInTheDocument();
    expect(screen.queryByText('Frozen snapshot')).not.toBeInTheDocument();
  });

  it('renders nothing when the breakdown is not found', () => {
    mockedUseQuery.mockReturnValue({ data: { podFinanceBreakdown: null }, loading: false, error: undefined } as any);
    renderDetail();
    expect(screen.queryByRole('button', { name: /back to pod finance/i })).not.toBeInTheDocument();
  });
});
