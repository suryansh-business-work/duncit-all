import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import HostDashboardPage from '../index';
import { HOST_DASHBOARD_ME, HOST_DASHBOARD_PODS } from '../queries';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>();
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
  { id: 'p1', pod_date_time: iso(5), pod_type: 'PAID', pod_hosts_id: ['h'], pod_attendees: ['a'] },
  // past + free
  { id: 'p2', pod_date_time: iso(-5), pod_type: 'FREE_POD', pod_hosts_id: ['h'], pod_attendees: [] },
  // no date
  { id: 'p3', pod_date_time: null, pod_type: 'PAID', pod_hosts_id: ['h'], pod_attendees: ['a', 'b'] },
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
    <MockedProvider mocks={mocks} addTypename={false}>
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

  it('renders the populated dashboard with welcome name, stats and earnings', async () => {
    setup([meMock(), podsMock]);
    expect(await screen.findByText('Welcome back, Alice Host')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    // Stats labels.
    expect(screen.getByText('Pods')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    // Earnings card balance.
    expect(screen.getByText('AVAILABLE BALANCE')).toBeInTheDocument();
    // Quick actions.
    expect(screen.getByText('Create pod')).toBeInTheDocument();
    await flush();
  });

  it('computes upcoming and paid pod counts once pods resolve', async () => {
    setup([meMock(), podsMock]);
    await screen.findByText('Welcome back, Alice Host');
    await flush();
    // 3 pods total, 1 upcoming (future), 2 paid (non-FREE).
    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('shows the GREEN health hint and navigates on health meter click', async () => {
    setup([meMock('GREEN'), podsMock]);
    const hint = await screen.findByText('Your host profile is in great shape.');
    expect(hint).toBeInTheDocument();
    const meter = screen.getByRole('button', { name: /Profile health/i });
    meter.click();
    expect(navigateMock).toHaveBeenCalledWith('/account/health');
  });

  it('shows the RED band hint when health is low', async () => {
    setup([meMock('RED'), podsMock]);
    expect(
      await screen.findByText('Complete your profile and verification to host with trust.'),
    ).toBeInTheDocument();
  });

  it('shows the YELLOW band hint', async () => {
    setup([meMock('YELLOW'), podsMock]);
    expect(
      await screen.findByText('A few profile + verification items to tighten up.'),
    ).toBeInTheDocument();
  });

  it('falls back to a generic subtitle when the user has no full name', async () => {
    setup([meMock('GREEN', null), podsMock]);
    expect(await screen.findByText('Your host overview')).toBeInTheDocument();
  });
});
