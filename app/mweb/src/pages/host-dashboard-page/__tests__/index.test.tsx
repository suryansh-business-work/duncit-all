import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MockedProvider } from '@apollo/client/testing/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import HostDashboardPage from '../index';
import { HOST_DASHBOARD_ME, HOST_DASHBOARD_PODS } from '../queries';

const navigateMock = vi.fn();
vi.mock('react-router', async (orig) => {
  const actual = await orig<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigateMock };
});

// x-charts (used by the HostInsights child) needs ResizeObserver + matchMedia.
beforeAll(() => {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver;
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
});

function iso(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

const USER_ID = 'user-1';

const pods = [
  // future + paid
  { id: 'p1', pod_date_time: iso(5), pod_type: 'PAID', pod_hosts_id: ['h'], pod_attendees: ['a'], seats_taken: 1 },
  // past + free
  { id: 'p2', pod_date_time: iso(-5), pod_type: 'FREE', pod_hosts_id: ['h'], pod_attendees: [], seats_taken: 0 },
  // no date
  { id: 'p3', pod_date_time: null, pod_type: 'PAID', pod_hosts_id: ['h'], pod_attendees: ['a', 'b'], seats_taken: 2 },
];

function meMock(band = 'GREEN', fullName: string | null = 'Alice Host') {
  return {
    request: { query: HOST_DASHBOARD_ME },
    result: {
      data: {
        me: { user_id: USER_ID, full_name: fullName },
        myWallet: { balance: 500, currency_symbol: '₹', next_payout_at: '2026-08-01T00:00:00.000Z' },
        myAccountHealth: { total_score: 82, band },
        myHostEarningsSummary: {
          currency_symbol: '₹',
          lifetime_earnings: 1000,
          pending_amount: 50,
          pods_completed: 4,
          this_month_earnings: 200,
        },
      },
    },
  };
}

const podsMock = {
  request: { query: HOST_DASHBOARD_PODS, variables: { host_user_id: USER_ID } },
  result: { data: { pods } },
};

function setup(mocks: any[]) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter>
        <HostDashboardPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe('HostDashboardPage', () => {
  it('shows a spinner while the identity query is loading', () => {
    setup([meMock(), podsMock]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders an error alert when the identity query fails', async () => {
    setup([{ request: { query: HOST_DASHBOARD_ME }, error: new Error('me boom') }]);
    expect(await screen.findByText('me boom')).toBeInTheDocument();
  });

  it('renders the populated dashboard with header, stats, earnings and quick actions', async () => {
    setup([meMock(), podsMock]);
    expect(await screen.findByText('AVAILABLE BALANCE')).toBeInTheDocument();
    expect(screen.getByTestId('host-dashboard-screen')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    // Stats labels.
    expect(screen.getByText('Pods')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    // Earnings card: wallet balance + settled-earnings summary.
    expect(screen.getByText('₹1000.00')).toBeInTheDocument();
    expect(screen.getByTestId('earnings-summary-tiles')).toBeInTheDocument();
    // Quick actions.
    expect(screen.getByText('Create pod')).toBeInTheDocument();
    // The welcome greeting was dropped in the calm redesign.
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
    await flush();
  });

  it('computes upcoming and paid pod counts once pods resolve', async () => {
    setup([meMock(), podsMock]);
    await screen.findByText('AVAILABLE BALANCE');
    // 3 pods total, 1 upcoming (future), 2 paid (non-FREE).
    expect(await screen.findByText('3')).toBeInTheDocument();
    const podStats = screen
      .getAllByTestId('stat-tile')
      .filter((tile) => ['Pods', 'Upcoming', 'Paid'].includes(tile.firstChild?.textContent ?? ''))
      .map((tile) => [tile.firstChild?.textContent, tile.lastChild?.textContent]);
    expect(podStats).toEqual([
      ['Pods', '3'],
      ['Upcoming', '1'],
      ['Paid', '2'],
    ]);
  });

  it('shows the health score and navigates on health row click', async () => {
    setup([meMock('GREEN'), podsMock]);
    const row = await screen.findByRole('button', { name: 'View profile health' });
    expect(row).toHaveTextContent('82');
    expect(row).toHaveTextContent('Profile health');
    row.click();
    expect(navigateMock).toHaveBeenCalledWith('/account/health');
  });

  it.each([
    ['GREEN', '#2e7d32'],
    ['YELLOW', '#ed6c02'],
    ['RED', '#d32f2f'],
  ])('colours the health score disc by the %s band', async (band, colour) => {
    setup([meMock(band), podsMock]);
    const row = await screen.findByRole('button', { name: 'View profile health' });
    const disc = within(row).getByText('82');
    expect(disc).toHaveStyle({ backgroundColor: colour });
  });

  it('still renders the dashboard when the user has no full name', async () => {
    setup([meMock('GREEN', null), podsMock]);
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('AVAILABLE BALANCE')).toBeInTheDocument();
  });
});
