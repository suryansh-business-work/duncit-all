import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { PodFinancePage, PodFinanceDetailPage } from '../../src/pages/finance/pod-finance-page';
import SettlementStatusChip, { FrozenBadge } from '../../src/pages/finance/pod-finance-page/SettlementStatusChip';
import { resetTableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  makePodBreakdown,
  podBreakdownLoadingMock,
  podBreakdownMock,
  podFinanceReleasesMock,
} from '../mocks/pod-finance.mock';

beforeEach(() => {
  resetTableControls();
});

describe('SettlementStatusChip', () => {
  it('labels each status and falls back for an unknown one', () => {
    const { rerender } = renderWithProviders(<SettlementStatusChip status={'LIVE' as never} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    rerender(<SettlementStatusChip status={'PENDING_APPROVAL' as never} />);
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    rerender(<SettlementStatusChip status={'SETTLED' as never} />);
    expect(screen.getByText('Settled')).toBeInTheDocument();
    rerender(<SettlementStatusChip status={'WEIRD' as never} />);
    expect(screen.getByText('WEIRD')).toBeInTheDocument();
    rerender(<FrozenBadge />);
    expect(screen.getByText('Frozen snapshot')).toBeInTheDocument();
  });
});

describe('PodFinancePage', () => {
  it('groups releases into rows and navigates to a pod', async () => {
    renderWithProviders(<PodFinancePage />, {
      path: '/',
      mocks: [podFinanceReleasesMock()],
      extra: <Route path="/pod-finance/:podId" element={<div data-testid="detail-probe">detail</div>} />,
    });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    expect(screen.getByText('Beta')).toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId('row-open')[0]);
    expect(screen.getByTestId('detail-probe')).toBeInTheDocument();
  });

  it('renders an empty table when the query returns no data', async () => {
    renderWithProviders(<PodFinancePage />, { path: '/', mocks: [podFinanceReleasesMock(null, null)] });
    await waitFor(() => expect(screen.getByText('No pods with payment activity yet.')).toBeInTheDocument());
  });
});

describe('PodFinanceDetailPage', () => {
  const mount = (mock: ReturnType<typeof podBreakdownMock>) =>
    renderWithProviders(<PodFinanceDetailPage />, {
      path: '/pod-finance/:podId',
      entry: '/pod-finance/pod1',
      mocks: [mock],
      extra: <Route path="/pod-finance" element={<div data-testid="list-probe">list</div>} />,
    });

  it('shows the loading guard', () => {
    mount(podBreakdownLoadingMock());
    expect(screen.getByTestId('qg-loading')).toBeInTheDocument();
  });

  it('renders a venue pod waterfall (frozen, completed) and navigates back', async () => {
    mount(podBreakdownMock());
    expect(await screen.findByRole('heading', { name: 'Yoga' })).toBeInTheDocument();
    expect(screen.getByText('Frozen snapshot')).toBeInTheDocument();
    expect(screen.getByText('5. Venue Amount')).toBeInTheDocument();
    expect(screen.getByText('Host Earnings Summary')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to pod finance/i }));
    expect(screen.getByTestId('list-probe')).toBeInTheDocument();
  });

  it('renders a pod without a venue (no venue step, not frozen, not completed)', async () => {
    mount(
      podBreakdownMock(
        makePodBreakdown({ has_venue: false, frozen: false, completed_at: null, settlement_status: 'LIVE' }),
      ),
    );
    await screen.findByRole('heading', { name: 'Yoga' });
    expect(screen.queryByText('5. Venue Amount')).not.toBeInTheDocument();
    expect(screen.queryByText('Frozen snapshot')).not.toBeInTheDocument();
  });

  it('renders nothing when the breakdown is not found', async () => {
    mount(podBreakdownMock(null));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /back to pod finance/i })).not.toBeInTheDocument(),
    );
  });
});
