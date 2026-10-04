import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';
import { makeSocialAccount } from '../mocks';

// chart.js draws on a canvas jsdom does not implement: keep the props the
// chart was handed so the REAL series PostMetrics builds can be asserted on.
interface BarProps {
  'aria-label': string;
  data: { labels: string[]; datasets: { label: string; data: number[] }[] };
  options: { indexAxis: 'x' | 'y' };
}
const bars = vi.hoisted(() => new Map<string, BarProps>());
vi.mock('react-chartjs-2', () => ({
  Bar: (props: BarProps) => {
    bars.set(props['aria-label'], props);
    return <canvas role="img" aria-label={props['aria-label']} />;
  },
}));
vi.mock('@duncit/table', () => import('./table-mock'));

import PostMetrics from '../../src/pages/social-accounts-page/posts/PostMetrics';
import PostsTab from '../../src/pages/social-accounts-page/posts/PostsTab';
import PostsTable from '../../src/pages/social-accounts-page/posts/PostsTable';
import type { SocialPostDetail, SocialPostRow } from '../../src/pages/social-accounts-page/queries';

afterEach(() => {
  bars.clear();
  __setTableRows([]);
  vi.clearAllMocks();
});

const makePostRow = (over: Partial<SocialPostRow> = {}): SocialPostRow => ({
  id: 'p1',
  account_id: 'sa1',
  account_name: 'Duncit Pages',
  platform: 'LINKEDIN',
  text: 'Weekend run club recap',
  media_url: null,
  permalink: null,
  published_at: '2026-09-01T10:00:00.000Z',
  likes: 1234,
  comments: 56,
  shares: 7,
  views: 9000,
  engagement: 1297,
  engagement_rate: 3.456,
  ai_score: null,
  ...over,
});

const makeDetail = (post: Partial<SocialPostRow> = {}): SocialPostDetail => ({
  post: { ...makePostRow(post), ai_analysis: null },
  average: { posts: 12, likes: 80.25, comments: 10, shares: 2, views: 4500, engagement: 92 },
  sentiment: { positive: 0, neutral: 0, negative: 0, flagged: 0, pending: 0 },
  recent_comments: [],
});

describe('PostMetrics', () => {
  it('puts each number beside the account average and formats the engagement rate', () => {
    renderWithProviders(<PostMetrics detail={makeDetail()} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('Account average: 80.3')).toBeInTheDocument();
    expect(screen.getByText('56')).toBeInTheDocument();
    expect(screen.getByText('Account average: 10')).toBeInTheDocument();
    expect(screen.getByText('Account average: 2')).toBeInTheDocument();
    expect(screen.getByText('9,000')).toBeInTheDocument();
    expect(screen.getByText('Account average: 4,500')).toBeInTheDocument();
    expect(screen.getByText('3.5%')).toBeInTheDocument();
    expect(screen.getByText('Per post, as a share of followers')).toBeInTheDocument();
    expect(screen.getByText('Engagement rate')).toBeInTheDocument();
  });

  it('shows a dash for views the network does not report', () => {
    renderWithProviders(<PostMetrics detail={makeDetail({ views: null })} />);
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('9,000')).not.toBeInTheDocument();
  });

  it('charts likes, comments and shares (not views) against the average as columns', () => {
    renderWithProviders(<PostMetrics detail={makeDetail()} />);
    const chartBox = screen.getByTestId('social-post-vs-average');
    expect(within(chartBox).getByRole('img', { name: 'This post compared with the account’s average' })).toBeInTheDocument();
    const bar = bars.get('This post compared with the account’s average');
    expect(bar?.data.labels).toEqual(['Likes', 'Comments', 'Shares']);
    expect(bar?.data.datasets.map((d) => [d.label, d.data])).toEqual([
      ['This post', [1234, 56, 7]],
      ['Account average', [80.25, 10, 2]],
    ]);
    expect(bar?.options.indexAxis).toBe('x');
  });
});

describe('PostsTable', () => {
  it('lists the fetched posts and opens the clicked row', async () => {
    const row = makePostRow();
    __setTableRows([row]);
    const onOpen = vi.fn();
    renderWithProviders(<PostsTable accounts={[makeSocialAccount()]} onOpen={onOpen} />);
    expect(screen.getByTestId('duncit-table')).toHaveAttribute('data-table-id', 'marketing-social-posts');
    const tableRow = await screen.findByTestId('table-row');
    expect(within(tableRow).getAllByText('Weekend run club recap').length).toBeGreaterThan(0);
    fireEvent.click(within(tableRow).getByRole('button', { name: 'rowclick-0' }));
    expect(onOpen).toHaveBeenCalledWith(row);
  });

  it('says there are no posts when the table is empty', async () => {
    renderWithProviders(<PostsTable accounts={[]} onOpen={vi.fn()} />);
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No posts yet.');
  });
});

describe('PostsTab', () => {
  it('explains the tab and hands the opened post id up', async () => {
    __setTableRows([makePostRow({ id: 'p42' })]);
    const onOpenPost = vi.fn();
    renderWithProviders(<PostsTab accounts={[makeSocialAccount()]} onOpenPost={onOpenPost} />);
    const tab = screen.getByTestId('social-posts');
    expect(within(tab).getByText(/Every post from your connected accounts/)).toBeInTheDocument();
    fireEvent.click(await within(tab).findByRole('button', { name: 'rowclick-0' }));
    expect(onOpenPost).toHaveBeenCalledWith('p42');
  });
});
