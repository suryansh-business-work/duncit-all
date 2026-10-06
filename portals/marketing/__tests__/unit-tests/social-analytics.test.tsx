import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';

// chart.js draws on a canvas jsdom does not implement. Stub only the drawing
// primitive and keep the props it was handed, so the REAL data/options each
// chart component builds can be asserted on (including the tick callbacks).
interface ChartProps {
  data: { labels: string[]; datasets: Record<string, unknown>[] };
  options: {
    indexAxis?: 'x' | 'y';
    plugins: { legend: { display: boolean }; tooltip: unknown };
    scales: Record<'x' | 'y', { ticks: { callback?: (value: number) => string; maxTicksLimit?: number } }>;
  };
}
const charts = vi.hoisted(() => new Map<string, ChartProps & { kind: string }>());
vi.mock('react-chartjs-2', () => {
  const stub = (kind: string) =>
    function ChartStub(props: ChartProps & { 'aria-label': string }) {
      charts.set(props['aria-label'], { kind, data: props.data, options: props.options });
      return <canvas role="img" aria-label={props['aria-label']} />;
    };
  return { Bar: stub('bar'), Line: stub('line') };
});
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatTime: (d: Date) => `h${d.getHours()}` }),
}));

import { SOCIAL_ANALYTICS, type SocialAccount, type SocialAnalytics } from '../../src/pages/social-accounts-page/queries';
import { PLATFORM_LABEL, enumOptions } from '../../src/pages/social-accounts-page/copy';
import { ranked } from '../../src/pages/social-accounts-page/analytics/ranked';
import AnalyticsFilters from '../../src/pages/social-accounts-page/analytics/AnalyticsFilters';
import AnalyticsTab from '../../src/pages/social-accounts-page/analytics/AnalyticsTab';
import BarBreakdownChart from '../../src/pages/social-accounts-page/analytics/BarBreakdownChart';
import LineTrendChart from '../../src/pages/social-accounts-page/analytics/LineTrendChart';
import SocialKpis from '../../src/pages/social-accounts-page/analytics/SocialKpis';
import TimingCharts from '../../src/pages/social-accounts-page/analytics/TimingCharts';

const chart = (label: string) => {
  const props = charts.get(label);
  if (!props) throw new Error(`chart "${label}" was not drawn`);
  return props;
};

const account = (id: string, name: string): SocialAccount => ({
  id,
  provider: 'META',
  platform: 'FACEBOOK',
  name,
  handle: null,
  avatar_url: null,
  profile_url: null,
  followers: 10,
  status: 'CONNECTED',
  last_error: null,
  last_synced_at: null,
  flagged_open: 0,
});

const makeAnalytics = (overrides: Partial<SocialAnalytics> = {}): SocialAnalytics => ({
  days: ['2026-09-01', '2026-09-02'],
  followers: 1234567,
  posts: 42,
  likes: 100,
  comments: 20,
  shares: 5,
  views: 9000,
  engagement: 125,
  engagement_rate: 3.456,
  engagement_series: [
    { key: 'likes', values: [60, 40] },
    { key: 'comments', values: [12, 8] },
  ],
  follower_series: [null, 1234567],
  by_account: [
    { account_id: 'a1', name: 'Small Page', platform: 'FACEBOOK', followers: 1, posts: 1, engagement: 5 },
    { account_id: 'a2', name: 'Big Page', platform: 'INSTAGRAM', followers: 2, posts: 2, engagement: 120 },
  ],
  by_platform: [
    { platform: 'FACEBOOK', posts: 1, engagement: 5 },
    { platform: 'INSTAGRAM', posts: 2, engagement: 120 },
  ],
  by_weekday: [1, 2, 3, 4, 5, 6, 7],
  by_hour: Array.from({ length: 24 }, (_, hour) => hour * 2),
  top_posts: [
    {
      id: 'p1',
      text: 'An announcement that runs far longer than forty characters in total',
      platform: 'FACEBOOK',
      account_name: 'Small Page',
      engagement: 70,
    },
    { id: 'p2', text: 'Short one', platform: 'INSTAGRAM', account_name: 'Big Page', engagement: 30 },
  ],
  sentiment: { positive: 7, neutral: 2, negative: 1, flagged: 3, pending: 0 },
  ...overrides,
});

/** The analytics as the server returns them, with every __typename the cache expects. */
const withTypenames = (analytics: SocialAnalytics) => ({
  __typename: 'SocialAnalytics',
  ...analytics,
  engagement_series: analytics.engagement_series.map((s) => ({ __typename: 'SocialSeries', ...s })),
  by_account: analytics.by_account.map((r) => ({ __typename: 'SocialAccountEngagement', ...r })),
  by_platform: analytics.by_platform.map((r) => ({ __typename: 'SocialPlatformEngagement', ...r })),
  top_posts: analytics.top_posts.map((r) => ({ __typename: 'SocialTopPost', ...r })),
  sentiment: { __typename: 'SocialSentimentSummary', ...analytics.sentiment },
});

const analyticsMock = (
  input: { account_ids: string[] | null; days: number },
  analytics: SocialAnalytics = makeAnalytics(),
): MockedResponse => ({
  request: { query: SOCIAL_ANALYTICS, variables: { input } },
  result: { data: { socialAnalytics: withTypenames(analytics) } },
});

afterEach(() => {
  charts.clear();
  vi.clearAllMocks();
});

// ===========================================================================
describe('ranked', () => {
  it('orders largest first without touching the array Apollo owns', () => {
    const rows = Object.freeze([{ v: 2 }, { v: 9 }, { v: 5 }]);
    const result = ranked(rows, (row) => row.v);
    expect(result.map((row) => row.v)).toEqual([9, 5, 2]);
    expect(rows.map((row) => row.v)).toEqual([2, 9, 5]);
    expect(result).not.toBe(rows);
  });

  it('returns an empty ranking for no rows', () => {
    expect(ranked([], () => 0)).toEqual([]);
  });
});

describe('enumOptions', () => {
  it('turns each enum value into a filter option with its translated label', () => {
    const t = (key: string) => `T(${key})`;
    expect(enumOptions(['FACEBOOK', 'X'] as const, PLATFORM_LABEL, t)).toEqual([
      { value: 'FACEBOOK', label: 'T(marketing.social.platformFacebook)' },
      { value: 'X', label: 'T(marketing.social.platformX)' },
    ]);
  });
});

// ===========================================================================
describe('AnalyticsFilters', () => {
  const accounts = [account('a1', 'Duncit Page'), account('a2', 'Duncit Insta')];
  const renderFilters = (accountIds: string[] = [], days: 7 | 30 | 90 = 30) => {
    const onAccountIds = vi.fn();
    const onDays = vi.fn();
    render(<AnalyticsFilters accounts={accounts} accountIds={accountIds} onAccountIds={onAccountIds} days={days} onDays={onDays} />);
    return { onAccountIds, onDays };
  };

  it('reads "All accounts" when nothing is picked', () => {
    renderFilters();
    expect(screen.getByRole('combobox')).toHaveTextContent('All accounts');
  });

  it('names the picked accounts, falling back to the id of one no longer connected', () => {
    renderFilters(['a2', 'gone']);
    expect(screen.getByRole('combobox')).toHaveTextContent('Duncit Insta, gone');
  });

  it('adds a picked account to the selection and ticks the ones already in it', () => {
    const { onAccountIds } = renderFilters(['a2']);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = screen.getByRole('listbox');
    const checkboxes = within(listbox).getAllByRole('checkbox');
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    fireEvent.click(within(listbox).getByRole('option', { name: 'Duncit Page' }));
    expect(onAccountIds).toHaveBeenCalledWith(['a2', 'a1']);
  });

  it('splits an autofilled comma-separated value into ids', () => {
    const { onAccountIds } = renderFilters();
    const native = screen.getByTestId('social-analytics-accounts').querySelector('input');
    if (!native) throw new Error('native select input missing');
    fireEvent.change(native, { target: { value: 'a1' } });
    expect(onAccountIds).toHaveBeenCalledWith(['a1']);
  });

  it('offers every period and reports the one picked', () => {
    const { onDays } = renderFilters([], 30);
    const group = screen.getByRole('group', { name: 'Period' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['7 days', '30 days', '90 days']);
    expect(within(group).getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(group).getByRole('button', { name: '90 days' }));
    expect(onDays).toHaveBeenCalledWith(90);
  });

  it('keeps the period when the selected one is clicked again (no empty period)', () => {
    const { onDays } = renderFilters([], 7);
    fireEvent.click(screen.getByRole('button', { name: '7 days' }));
    expect(onDays).not.toHaveBeenCalled();
  });
});

// ===========================================================================
describe('SocialKpis', () => {
  const tileValues = () => screen.getByTestId('social-kpis').textContent;

  it('shows the period in six formatted numbers with their hints', () => {
    render(<SocialKpis data={makeAnalytics()} loading={false} />);
    const kpis = screen.getByTestId('social-kpis');
    for (const label of ['Followers', 'Posts', 'Engagement', 'Engagement rate', 'Views', 'Flagged comments']) {
      expect(within(kpis).getByText(label)).toBeInTheDocument();
    }
    expect(within(kpis).getByText('12,34,567')).toBeInTheDocument();
    expect(within(kpis).getByText('42')).toBeInTheDocument();
    expect(within(kpis).getByText('125')).toBeInTheDocument();
    expect(within(kpis).getByText('3.46%')).toBeInTheDocument();
    expect(within(kpis).getByText('9,000')).toBeInTheDocument();
    expect(within(kpis).getByText('3')).toBeInTheDocument();
    expect(within(kpis).getByText('Comments the AI flagged in the period')).toBeInTheDocument();
  });

  it('shows skeletons, not zeros, while the first load is in flight', () => {
    const { container } = render(<SocialKpis data={undefined} loading />);
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(6);
    expect(tileValues()).not.toContain('0%');
  });

  it('keeps the numbers on screen during a refetch', () => {
    const { container } = render(<SocialKpis data={makeAnalytics()} loading />);
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(0);
    expect(tileValues()).toContain('12,34,567');
  });

  it('reads zero everywhere when there is no data and nothing loading', () => {
    render(<SocialKpis data={undefined} loading={false} />);
    const kpis = screen.getByTestId('social-kpis');
    expect(within(kpis).getAllByText('0')).toHaveLength(5);
    expect(within(kpis).getByText('0%')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('BarBreakdownChart', () => {
  it('draws one horizontal series without a legend, sized to its rows', () => {
    const labels = Array.from({ length: 10 }, (_, i) => `Row ${i}`);
    render(
      <BarBreakdownChart labels={labels} series={[{ label: 'Engagement', values: labels.map((_, i) => i) }]} ariaLabel="By row" testId="bar-h" />,
    );
    const { kind, data, options } = chart('By row');
    expect(kind).toBe('bar');
    expect(screen.getByRole('img', { name: 'By row' })).toBeInTheDocument();
    expect(data.labels).toEqual(labels);
    expect(data.datasets).toHaveLength(1);
    expect(data.datasets[0]).toMatchObject({ label: 'Engagement', data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], borderRadius: 4, maxBarThickness: 28 });
    expect(options.indexAxis).toBe('y');
    expect(options.plugins.legend.display).toBe(false);
    expect(options.plugins.tooltip).toBeDefined();
    // Values on x, names on y with at most 10 ticks.
    expect(options.scales.x.ticks.callback?.(1234567)).toBe('12,34,567');
    expect(options.scales.y.ticks.maxTicksLimit).toBe(10);
    expect(screen.getByTestId('bar-h')).toHaveStyle({ height: '310px' });
  });

  it('never shrinks a short horizontal chart below its floor', () => {
    render(<BarBreakdownChart labels={['Only']} series={[{ label: 'E', values: [1] }]} ariaLabel="Short" testId="bar-short" />);
    expect(screen.getByTestId('bar-short')).toHaveStyle({ height: '160px' });
  });

  it('draws compared series as fixed-height columns with a legend and distinct colours', () => {
    render(
      <BarBreakdownChart
        labels={['Mon', 'Tue']}
        series={[
          { label: 'This week', values: [1, 2] },
          { label: 'Last week', values: [3, 4] },
        ]}
        horizontal={false}
        ariaLabel="By day"
        testId="bar-v"
      />,
    );
    const { data, options } = chart('By day');
    expect(options.indexAxis).toBe('x');
    expect(options.plugins.legend.display).toBe(true);
    expect(data.datasets.map((d) => d.label)).toEqual(['This week', 'Last week']);
    expect(data.datasets[0].backgroundColor).not.toBe(data.datasets[1].backgroundColor);
    // Names on x (up to 12 ticks), values on y.
    expect(options.scales.x.ticks.maxTicksLimit).toBe(12);
    expect(options.scales.y.ticks.callback?.(4500)).toBe('4,500');
    expect(screen.getByTestId('bar-v')).toHaveStyle({ height: '240px' });
  });
});

// ===========================================================================
describe('LineTrendChart', () => {
  it('draws a single filled line that bridges gaps, without a legend', () => {
    render(<LineTrendChart labels={['1 Sep', '2 Sep', '3 Sep']} series={[{ label: 'Followers', values: [10, null, 12] }]} ariaLabel="Growth" testId="line-one" />);
    const { kind, data, options } = chart('Growth');
    expect(kind).toBe('line');
    expect(data.labels).toEqual(['1 Sep', '2 Sep', '3 Sep']);
    expect(data.datasets[0]).toMatchObject({ label: 'Followers', data: [10, null, 12], spanGaps: true, fill: true });
    expect(options.plugins.legend.display).toBe(false);
    expect(options.plugins.tooltip).toBeDefined();
    expect(options.scales.y.ticks.callback?.(250000)).toBe('2,50,000');
    expect(screen.getByTestId('line-one')).toHaveStyle({ height: '260px' });
  });

  it('draws several unfilled lines with a legend', () => {
    render(
      <LineTrendChart
        labels={['1 Sep']}
        series={[
          { label: 'Likes', values: [1] },
          { label: 'Shares', values: [2] },
        ]}
        ariaLabel="Engagement"
        testId="line-many"
      />,
    );
    const { data, options } = chart('Engagement');
    expect(data.datasets.map((d) => [d.label, d.fill])).toEqual([
      ['Likes', false],
      ['Shares', false],
    ]);
    expect(data.datasets[0].borderColor).not.toBe(data.datasets[1].borderColor);
    expect(options.plugins.legend.display).toBe(true);
  });
});

// ===========================================================================
describe('TimingCharts', () => {
  it('ranks networks, names top posts by their opening text, and lays out weekdays and hours', () => {
    renderWithProviders(<TimingCharts analytics={makeAnalytics()} />);

    const network = chart('Engagement by network');
    expect(network.data.labels).toEqual(['Instagram', 'Facebook']);
    expect(network.data.datasets[0]).toMatchObject({ label: 'Engagement', data: [120, 5] });

    const top = chart('Top posts');
    expect(top.data.labels).toEqual(['Facebook · An announcement that runs far longer tha', 'Instagram · Short one']);
    expect(top.data.datasets[0].data).toEqual([70, 30]);

    const weekday = chart('Best day to post');
    expect(weekday.data.labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(weekday.data.datasets[0]).toMatchObject({ label: 'Average engagement per post', data: [1, 2, 3, 4, 5, 6, 7] });
    expect(weekday.options.indexAxis).toBe('x');

    const hour = chart('Best hour to post');
    expect(hour.data.labels).toHaveLength(24);
    expect(hour.data.labels[0]).toBe('h0');
    expect(hour.data.labels[18]).toBe('h18');
    expect(hour.data.datasets[0].data).toEqual(makeAnalytics().by_hour);
    expect(screen.getAllByText('Average engagement per post, in the portal’s time zone')).toHaveLength(2);
  });
});

// ===========================================================================
describe('AnalyticsTab', () => {
  const accounts = [account('a1', 'Duncit Page'), account('a2', 'Duncit Insta')];

  it('loads the last 30 days for every account and shows numbers, AI insights and all charts', async () => {
    renderWithProviders(<AnalyticsTab accounts={accounts} />, { mocks: [analyticsMock({ account_ids: null, days: 30 })] });
    expect(screen.getByTestId('social-ai-insights')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Engagement over time' })).not.toBeInTheDocument();

    expect(await screen.findByText('12,34,567')).toBeInTheDocument();
    for (const id of ['engagement', 'followers', 'by-account', 'sentiment', 'by-network', 'top-posts', 'weekday', 'hour']) {
      expect(screen.getByTestId(`social-chart-${id}`)).toBeInTheDocument();
    }
    expect(screen.queryByText('Nothing to show yet — connect an account and let it sync.')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refetches when the period changes', async () => {
    renderWithProviders(<AnalyticsTab accounts={accounts} />, {
      mocks: [analyticsMock({ account_ids: null, days: 30 }), analyticsMock({ account_ids: null, days: 7 }, makeAnalytics({ posts: 777 }))],
    });
    await screen.findByText('12,34,567');
    fireEvent.click(screen.getByRole('button', { name: '7 days' }));
    expect(await screen.findByText('777')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('narrows the query to the picked accounts', async () => {
    renderWithProviders(<AnalyticsTab accounts={accounts} />, {
      mocks: [analyticsMock({ account_ids: null, days: 30 }), analyticsMock({ account_ids: ['a2'], days: 30 }, makeAnalytics({ posts: 888 }))],
    });
    await screen.findByText('12,34,567');
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Duncit Insta' }));
    expect(await screen.findByText('888')).toBeInTheDocument();
  });

  it('shows the server error above the numbers', async () => {
    renderWithProviders(<AnalyticsTab accounts={accounts} />, {
      mocks: [
        {
          request: { query: SOCIAL_ANALYTICS, variables: { input: { account_ids: null, days: 30 } } },
          result: { errors: [new GraphQLError('Analytics are unavailable')] },
        },
      ],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Analytics are unavailable');
    expect(screen.queryByTestId('social-chart-engagement')).not.toBeInTheDocument();
  });

  it('with nothing connected, explains the empty state and offers no AI or charts', async () => {
    renderWithProviders(<AnalyticsTab accounts={[]} />, { mocks: [analyticsMock({ account_ids: null, days: 30 })] });
    expect(screen.getByText('Nothing to show yet — connect an account and let it sync.')).toBeInTheDocument();
    expect(await screen.findByText('12,34,567')).toBeInTheDocument();
    expect(screen.queryByTestId('social-ai-insights')).not.toBeInTheDocument();
    expect(screen.queryByTestId('social-chart-engagement')).not.toBeInTheDocument();
  });
});
