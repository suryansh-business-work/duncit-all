import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ChartData } from 'chart.js';
import { formatDay } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import {
  makeSocialAnalytics,
  makeSocialInsights,
  socialInsightsErrorMock,
  socialInsightsMock,
} from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

// jsdom has no canvas: the chart library is the drawing boundary, so it hands
// back the data it was given for the test to read.
vi.mock('react-chartjs-2', () => {
  const Chart = ({ data, 'aria-label': ariaLabel }: { data: ChartData; 'aria-label': string }) => (
    <div
      role="img"
      aria-label={ariaLabel}
      data-labels={JSON.stringify(data.labels)}
      data-series={JSON.stringify(data.datasets.map((set) => ({ label: set.label, data: set.data })))}
    />
  );
  return { Line: Chart, Bar: Chart };
});

import AiInsightsCard from '../../src/pages/social-accounts-page/analytics/AiInsightsCard';
import AnalyticsCharts from '../../src/pages/social-accounts-page/analytics/AnalyticsCharts';

afterEach(() => {
  vi.clearAllMocks();
});

const INPUT = { account_ids: ['a1'], days: 30 };

describe('AiInsightsCard', () => {
  it('waits for the marketer to ask before calling the AI', () => {
    renderWithProviders(<AiInsightsCard input={INPUT} />);
    expect(screen.getByText('AI insights')).toBeInTheDocument();
    expect(screen.getByText('What the numbers in this period say, and what to do next.')).toBeInTheDocument();
    expect(screen.getByTestId('social-ai-insights')).toHaveTextContent('Get AI insights');
    expect(screen.queryByTestId('social-ai-insights-result')).not.toBeInTheDocument();
  });

  it('shows the AI’s read of the period, section by section', async () => {
    renderWithProviders(<AiInsightsCard input={INPUT} />, {
      mocks: [socialInsightsMock(INPUT, makeSocialInsights({ what_to_avoid: [] }))],
    });
    fireEvent.click(screen.getByTestId('social-ai-insights'));
    const result = await screen.findByTestId('social-ai-insights-result');
    expect(result).toHaveAttribute('aria-live', 'polite');
    expect(within(result).getByText('Reels on weekends lifted engagement.')).toBeInTheDocument();
    expect(within(result).getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual([
      'What works',
      'Best times to post',
      'Do next',
    ]);
    expect(within(result).getByText('Short reels')).toBeInTheDocument();
    expect(within(result).getByText('Saturday 7pm')).toBeInTheDocument();
    expect(within(result).getByText('Post two reels a week')).toBeInTheDocument();
    expect(screen.getByTestId('social-ai-insights')).toHaveTextContent('Ask again');
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('reports a failed request and shows no answer', async () => {
    renderWithProviders(<AiInsightsCard input={INPUT} />, {
      mocks: [socialInsightsErrorMock(INPUT, 'AI quota exhausted')],
    });
    fireEvent.click(screen.getByTestId('social-ai-insights'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('AI quota exhausted', 'error'));
    expect(screen.queryByTestId('social-ai-insights-result')).not.toBeInTheDocument();
    expect(screen.getByTestId('social-ai-insights')).toHaveTextContent('Get AI insights');
  });

  it('clears the answer when the server returns none', async () => {
    const mocks = [
      socialInsightsMock(INPUT, makeSocialInsights()),
      { ...socialInsightsMock(INPUT, makeSocialInsights()), result: { data: { socialInsights: null } } },
    ];
    renderWithProviders(<AiInsightsCard input={INPUT} />, { mocks });
    fireEvent.click(screen.getByTestId('social-ai-insights'));
    await screen.findByTestId('social-ai-insights-result');
    fireEvent.click(screen.getByTestId('social-ai-insights'));
    await waitFor(() => expect(screen.queryByTestId('social-ai-insights-result')).not.toBeInTheDocument());
    expect(screen.getByTestId('social-ai-insights')).toHaveTextContent('Get AI insights');
  });
});

const chartData = (name: string) => {
  const chart = screen.getByRole('img', { name });
  return {
    labels: JSON.parse(chart.dataset.labels ?? 'null') as string[],
    series: JSON.parse(chart.dataset.series ?? 'null') as { label: string; data: (number | null)[] }[],
  };
};

describe('AnalyticsCharts', () => {
  it('plots engagement by kind over the period’s days', () => {
    const analytics = makeSocialAnalytics();
    renderWithProviders(<AnalyticsCharts analytics={analytics} />);
    expect(screen.getByText('By the day each post went out')).toBeInTheDocument();
    expect(chartData('Engagement over time')).toEqual({
      labels: analytics.days.map((day) => formatDay(day)),
      series: [
        { label: 'Likes', data: [10, 30] },
        { label: 'Comments', data: [5, 7] },
        { label: 'Shares', data: [1, 2] },
      ],
    });
    expect(screen.getByTestId('social-chart-engagement')).toBeInTheDocument();
  });

  it('plots follower growth as one line, gaps kept', () => {
    renderWithProviders(<AnalyticsCharts analytics={makeSocialAnalytics()} />);
    expect(screen.getByText('All selected accounts together')).toBeInTheDocument();
    expect(chartData('Follower growth').series).toEqual([{ label: 'Followers', data: [100, null] }]);
  });

  it('ranks accounts by engagement, largest first', () => {
    const analytics = makeSocialAnalytics();
    renderWithProviders(<AnalyticsCharts analytics={analytics} />);
    expect(chartData('Engagement by account')).toEqual({
      labels: ['Big Page', 'Small Page'],
      series: [{ label: 'Engagement', data: [50, 5] }],
    });
    expect(analytics.by_account.map((row) => row.name)).toEqual(['Small Page', 'Big Page']);
  });

  it('splits comments by how they read', () => {
    renderWithProviders(<AnalyticsCharts analytics={makeSocialAnalytics()} />);
    expect(screen.getByText('The AI’s read of comments left in the period')).toBeInTheDocument();
    expect(chartData('How comments read')).toEqual({
      labels: ['Positive', 'Neutral', 'Negative'],
      series: [{ label: 'Comments', data: [6, 4, 2] }],
    });
  });

  it('draws empty charts for a period with no data', () => {
    renderWithProviders(
      <AnalyticsCharts
        analytics={makeSocialAnalytics({ days: [], engagement_series: [], follower_series: [], by_account: [] })}
      />,
    );
    expect(chartData('Engagement over time')).toEqual({ labels: [], series: [] });
    expect(chartData('Follower growth')).toEqual({ labels: [], series: [{ label: 'Followers', data: [] }] });
    expect(chartData('Engagement by account')).toEqual({ labels: [], series: [{ label: 'Engagement', data: [] }] });
  });
});
