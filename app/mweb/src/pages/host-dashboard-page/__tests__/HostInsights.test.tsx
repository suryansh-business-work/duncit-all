import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import HostInsights from '../HostInsights';
import { HOST_INSIGHTS } from '../queries';

// x-charts uses ResizeObserver + matchMedia (not implemented in jsdom).
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

const insightsResult = {
  data: {
    partnerDashboard: { host: { number_of_pods: 5, host_earning: 1234.5 } },
    hostInsights: {
      status_counts: { upcoming: 2, ongoing: 1, completed: 3, cancelled: 1 },
      monthly_earnings: [
        { month: '2026-3', total: 100 },
        { month: '2026-4', total: 250 },
      ],
    },
  },
};

// `to` is a live timestamp (new Date().toISOString()) so match variables loosely.
const mock = {
  request: { query: HOST_INSIGHTS },
  variableMatcher: () => true,
  result: insightsResult,
};

function iso(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

const pods = [
  { pod_date_time: iso(10), pod_attendees: ['a', 'b', 'c'], pod_hosts_id: ['h'] },
  { pod_date_time: iso(40), pod_attendees: ['a', 'b'], pod_hosts_id: ['h'] },
  { pod_date_time: null, pod_attendees: [], pod_hosts_id: [] },
];

function setup(withData: boolean, podList = pods) {
  return render(
    <MockedProvider mocks={withData ? [mock] : []} addTypename={false}>
      <HostInsights pods={podList} currency="₹" />
    </MockedProvider>,
  );
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe('HostInsights', () => {
  it('renders KPI defaults when the query has no data', () => {
    setup(false);
    expect(screen.getByText('Host Insights')).toBeInTheDocument();
    expect(screen.getByText('Total Pods')).toBeInTheDocument();
    expect(screen.getByText('Host Earnings')).toBeInTheDocument();
    // Defaults with no query data: ₹0.00 earnings (unique to the KPI tile).
    expect(screen.getByText('₹0.00')).toBeInTheDocument();
  });

  it('renders the four chart section titles', () => {
    setup(true);
    expect(screen.getByText('Pods Hosted in Past 6 Months')).toBeInTheDocument();
    expect(screen.getByText('Monthly Host Earnings')).toBeInTheDocument();
    expect(screen.getByText('Pod Status Distribution')).toBeInTheDocument();
    expect(screen.getByText('Participant Trend')).toBeInTheDocument();
  });

  it('populates KPIs from the HOST_INSIGHTS query result', async () => {
    setup(true);
    await flush();
    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(screen.getByText('₹1234.50')).toBeInTheDocument();
  });

  it('shows empty states when there is no chartable data', () => {
    setup(false, [{ pod_date_time: null, pod_attendees: [], pod_hosts_id: [] }]);
    // Every chart with all-zero data shows the shared empty message.
    expect(screen.getAllByText('No data available').length).toBeGreaterThan(0);
  });

  it('opens the filter sheet and applies a new range', async () => {
    setup(true);
    fireEvent.click(screen.getByLabelText('Filter pods by month'));
    // Dialog title + range chips appear.
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    // hasPods is true, so the "All" chip is present.
    fireEvent.click(within(dialog).getByText('Past 3 Months'));
    fireEvent.click(within(dialog).getByText('Apply'));
    // The chart title updates to the newly-applied range.
    expect(await screen.findByText('Pods Hosted in Past 3 Months')).toBeInTheDocument();
  });

  it('closes the filter sheet on Reset without changing the applied range', async () => {
    setup(true);
    fireEvent.click(screen.getByLabelText('Filter pods by month'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByText('Reset'));
    // Applied chart title is unchanged (still the default range).
    expect(screen.getByText('Pods Hosted in Past 6 Months')).toBeInTheDocument();
  });
});
