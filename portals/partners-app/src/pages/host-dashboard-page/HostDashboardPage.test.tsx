import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import HostDashboardPage from './HostDashboardPage';
import HostInsightsCharts from './HostInsightsCharts';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer } from '../../__tests__/groupC-link';

vi.mock('@duncit/dashboard', () => import('../../__tests__/dashboard-mock'));
vi.mock('@duncit/public-page', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  PublishPageCard: (props: { kind: string; title: string }) => <div data-testid="publish-card">{`${props.kind}:${props.title}`}</div>,
}));

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const dashboard = (over: Record<string, unknown> = {}) => ({
  me: { __typename: 'User', user_id: 'u1', full_name: 'Asha Rao', roles: ['USER', 'HOST'] },
  myWallet: { __typename: 'Wallet', balance: 1250, currency_symbol: '₹', next_payout_at: null },
  myHostEarningsSummary: {
    __typename: 'HostEarningsSummary',
    currency_symbol: '₹',
    lifetime_earnings: 9000,
    pending_amount: 300,
    pods_completed: 4,
    this_month_earnings: 1200,
  },
  myAccountHealth: { __typename: 'AccountHealth', total_score: 82, band: 'GREEN' },
  ...over,
});

const insights = (over: Record<string, unknown> = {}) => ({
  hostInsights: {
    __typename: 'HostInsights',
    status_counts: { __typename: 'HostStatusCounts', upcoming: 2, ongoing: 0, completed: 6, cancelled: 1 },
    monthly_earnings: [
      { __typename: 'HostMonthlyEarning', month: '2026-08', total: 400 },
      { __typename: 'HostMonthlyEarning', month: '2026-09', total: 800 },
    ],
    ...over,
  },
});

const mount = (answers: Record<string, ScriptedAnswer>) =>
  renderWithProviders(<HostDashboardPage />, {
    route: '/host/dashboard',
    link: scriptedLink({ PartnerHostDashboard: dashboard(), PartnerHostInsights: insights(), ...answers }),
  });

describe('HostDashboardPage', () => {
  it('welcomes an approved host by name with their balance, quick actions and public page', async () => {
    mount({});
    expect(await screen.findByText('Welcome back, Asha Rao')).toBeTruthy();
    expect(screen.getByText('₹1,250')).toBeTruthy();
    expect(screen.getByText('HOST')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create pod' }).getAttribute('href')).toBe('/host/pods?new=1');
    expect(screen.getByTestId('publish-card').textContent).toBe('HOST:Asha Rao');
    expect(screen.queryByText(/You are not an approved host yet/)).toBeNull();
  });

  it('points a user who is not a host yet at the application and keeps Create pod off', async () => {
    mount({ PartnerHostDashboard: dashboard({ me: { __typename: 'User', user_id: 'u1', full_name: 'Asha Rao', roles: ['USER'] } }) });
    expect(await screen.findByText(/You are not an approved host yet/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Apply' }).getAttribute('href')).toBe('/become-host');
    expect(screen.getByRole('link', { name: 'Create pod' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.queryByTestId('publish-card')).toBeNull();
    expect(screen.queryByText('HOST')).toBeNull();
  });

  it('greets a host with no name on record in general words and offers the public page untitled', async () => {
    mount({ PartnerHostDashboard: dashboard({ me: { __typename: 'User', user_id: 'u1', full_name: null, roles: ['HOST'] } }) });
    expect(await screen.findByText('Earnings from your hosted pods')).toBeTruthy();
    expect(screen.getByTestId('publish-card').textContent).toBe('HOST:');
  });

  it('shows the earnings currency when the host has no wallet yet', async () => {
    mount({
      PartnerHostDashboard: dashboard({
        myWallet: null,
        myHostEarningsSummary: {
          __typename: 'HostEarningsSummary',
          currency_symbol: '$',
          lifetime_earnings: 0,
          pending_amount: 0,
          pods_completed: 0,
          this_month_earnings: 0,
        },
      }),
    });
    await screen.findByText('Welcome back, Asha Rao');
    const balance = within(screen.getByText('AVAILABLE BALANCE').parentElement as HTMLElement);
    expect(balance.getByText('$0')).toBeTruthy();
  });

  it('falls back to empty earnings, an empty status split and no health card when nothing has loaded', async () => {
    mount({ PartnerHostDashboard: new Error('Dashboard is down'), PartnerHostInsights: new Error('Insights are down') });
    expect(await screen.findByText('Dashboard is down')).toBeTruthy();
    expect(screen.getByText('Insights are down')).toBeTruthy();
    expect(screen.getByText('No pods yet. Once you host one it appears here.')).toBeTruthy();
    const balance = within(screen.getByText('AVAILABLE BALANCE').parentElement as HTMLElement);
    expect(balance.getByText('₹0')).toBeTruthy();
  });

  it('draws the pods by status and the monthly earnings from the insights', async () => {
    mount({});
    const chart = within(await screen.findByTestId('widget-insights'));
    expect(await chart.findByText('Pods by status')).toBeTruthy();
    expect(chart.getByRole('img', { name: 'Monthly host earnings' })).toBeTruthy();
    expect(chart.getByText(/Peak month: ₹800/)).toBeTruthy();
  });
});

describe('HostInsightsCharts', () => {
  const draw = (data: Parameters<typeof HostInsightsCharts>[0]['insights'], currencySymbol = '₹') =>
    renderWithProviders(<HostInsightsCharts insights={data} currencySymbol={currencySymbol} />);

  it('asks for a trend once there are not two months to draw', () => {
    draw({
      status_counts: { upcoming: 1, ongoing: 0, completed: 0, cancelled: 0 },
      monthly_earnings: [{ month: '2026-09', total: 800 }],
    });
    expect(screen.getByText('Not enough completed pods to draw a trend yet.')).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Monthly host earnings' })).toBeNull();
  });

  it('shows no trend and no pods for a host with no insights yet', () => {
    draw(null);
    expect(screen.getByText('No pods yet. Once you host one it appears here.')).toBeTruthy();
    expect(screen.getByText('Not enough completed pods to draw a trend yet.')).toBeTruthy();
  });

  it('labels each month, and keeps a bucket it cannot read as it came', () => {
    draw({
      status_counts: { upcoming: 0, ongoing: 0, completed: 3, cancelled: 0 },
      monthly_earnings: [
        { month: '2026-08', total: 0 },
        { month: 'not-a-month', total: 0 },
      ],
    });
    expect(screen.getByText('not-a-month')).toBeTruthy();
    expect(screen.getByText(/2026/)).toBeTruthy();
    expect(screen.getByText('Peak month: ₹0')).toBeTruthy();
  });

  it('draws every status with its count and a bar scaled to the total', () => {
    draw({
      status_counts: { upcoming: 1, ongoing: 1, completed: 2, cancelled: 0 },
      monthly_earnings: [],
    });
    expect(screen.getByRole('progressbar', { name: 'Completed' }).getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByRole('progressbar', { name: 'Upcoming' }).getAttribute('aria-valuenow')).toBe('25');
  });
});
