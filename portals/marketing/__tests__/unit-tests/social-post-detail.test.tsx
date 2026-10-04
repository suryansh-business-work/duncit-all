import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { flush, renderWithProviders } from '../testkit';
import { makeSocialAccount } from '../mocks';
import { fetchRowsFrom } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
// chart.js draws on a canvas jsdom does not implement; keep only the accessible stand-in.
vi.mock('react-chartjs-2', () => ({
  Bar: (props: { 'aria-label': string }) => <canvas role="img" aria-label={props['aria-label']} />,
  Line: (props: { 'aria-label': string }) => <canvas role="img" aria-label={props['aria-label']} />,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

import { DuncitTable } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../../src/pages/social-accounts-page/PlatformIcon';
import { getPostColumns } from '../../src/pages/social-accounts-page/posts/postColumns';
import PostAiAnalysis from '../../src/pages/social-accounts-page/posts/PostAiAnalysis';
import PostComments from '../../src/pages/social-accounts-page/posts/PostComments';
import PostDetailDrawer from '../../src/pages/social-accounts-page/posts/PostDetailDrawer';
import {
  ANALYZE_SOCIAL_POST,
  SOCIAL_POST,
  type SocialCommentRow,
  type SocialPlatform,
  type SocialPostAnalysis,
  type SocialPostDetail,
  type SocialPostRow,
} from '../../src/pages/social-accounts-page/queries';

afterEach(() => {
  vi.clearAllMocks();
});

const makePost = (over: Partial<SocialPostRow> = {}): SocialPostRow => ({
  id: 'p1',
  account_id: 'sa1',
  account_name: 'Duncit Pages',
  platform: 'INSTAGRAM',
  text: 'Sunday run club recap',
  media_url: 'https://cdn.example/p1.jpg',
  permalink: 'https://instagram.com/p/p1',
  published_at: '2026-09-01T10:00:00.000Z',
  likes: 1234,
  comments: 12,
  shares: 3,
  views: 4500,
  engagement: 1249,
  engagement_rate: 3.456,
  ai_score: 72,
  ...over,
});

const makeAnalysis = (over: Partial<SocialPostAnalysis> = {}): SocialPostAnalysis => ({
  score: 64,
  summary: 'The reel beat the account average.',
  strengths: ['Strong hook'],
  improvements: ['Shorter caption'],
  next_idea: 'Post a behind-the-scenes reel',
  analyzed_at: '2026-09-02T08:00:00.000Z',
  ...over,
});

const makeComment = (over: Partial<SocialCommentRow> = {}): SocialCommentRow => ({
  id: 'c1',
  account_id: 'sa1',
  account_name: 'Duncit Pages',
  platform: 'INSTAGRAM',
  post_text: null,
  post_permalink: null,
  permalink: null,
  author_name: 'Asha',
  author_handle: '@asha',
  text: 'Loved it!',
  published_at: '2026-09-01T12:00:00.000Z',
  likes: 2,
  ai_status: 'CLEAN',
  ai_sentiment: 'POSITIVE',
  ai_categories: [],
  ai_severity: null,
  ai_reason: 'Friendly praise',
  review_status: 'OPEN',
  ...over,
});

const makeDetail = (
  post: Partial<SocialPostRow> = {},
  analysis: SocialPostAnalysis | null = null,
  comments: SocialCommentRow[] = [makeComment()],
): SocialPostDetail => ({
  post: { ...makePost(post), ai_analysis: analysis },
  average: { posts: 8, likes: 80, comments: 6, shares: 2, views: 3000, engagement: 88 },
  sentiment: { positive: 5, neutral: 2, negative: 1, flagged: 1, pending: 0 },
  recent_comments: comments,
});

/** The detail as the server sends it: every object carries its GraphQL type name. */
const typedDetail = (detail: SocialPostDetail) => ({
  __typename: 'SocialPostDetail',
  post: {
    __typename: 'SocialPost',
    ...detail.post,
    ai_analysis: detail.post.ai_analysis && { __typename: 'SocialPostAnalysis', ...detail.post.ai_analysis },
  },
  average: { __typename: 'SocialPostAverage', ...detail.average },
  sentiment: { __typename: 'SocialSentimentSummary', ...detail.sentiment },
  recent_comments: detail.recent_comments.map((comment) => ({ __typename: 'SocialComment', ...comment })),
});

const postMock = (id: string, detail: SocialPostDetail): MockedResponse => ({
  request: { query: SOCIAL_POST, variables: { id } },
  result: { data: { socialPost: typedDetail(detail) } },
});

const analyzeMock = (id: string, detail: SocialPostDetail): MockedResponse => ({
  request: { query: ANALYZE_SOCIAL_POST, variables: { id } },
  result: { data: { analyzeSocialPost: typedDetail(detail) } },
});

const rejection = (query: MockedResponse['request'], message: string): MockedResponse => ({
  request: query,
  result: { errors: [new GraphQLError(message)] },
});

describe('PlatformIcon', () => {
  const cases: [SocialPlatform, string][] = [
    ['LINKEDIN', 'LinkedInIcon'],
    ['FACEBOOK', 'FacebookIcon'],
    ['INSTAGRAM', 'InstagramIcon'],
    ['X', 'XIcon'],
    ['YOUTUBE', 'YouTubeIcon'],
  ];

  it.each(cases)('draws the %s mark as decoration', (platform, testId) => {
    renderWithProviders(<PlatformIcon platform={platform} fontSize="small" />);
    const icon = screen.getByTestId(testId);
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('focusable', 'false');
    expect(icon).toHaveClass('MuiSvgIcon-fontSizeSmall');
  });
});

/** An enum column's filter options (text and number columns have none). */
const optionsOf = (column: ReturnType<typeof getPostColumns>[number]) => ('options' in column ? column.options : undefined);

describe('getPostColumns', () => {
  const accounts = [makeSocialAccount(), makeSocialAccount({ id: 'sa2', name: 'Duncit Pets' })];

  const renderColumns = (rows: SocialPostRow[]) => {
    function PostsHarness() {
      const { t, locale } = useTranslation();
      return (
        <DuncitTable
          tableId="marketing-social-posts"
          columns={getPostColumns(accounts, t, locale)}
          fetchRows={fetchRowsFrom(rows)}
          getRowId={(row: SocialPostRow) => row.id}
        />
      );
    }
    return renderWithProviders(<PostsHarness />);
  };

  it('offers the connected accounts and every network as filters', () => {
    const { result } = renderHook(() => useTranslation());
    const columns = getPostColumns(accounts, result.current.t, result.current.locale);
    expect(columns.map((column) => column.field)).toEqual([
      'text',
      'account_id',
      'platform',
      'published_at',
      'likes',
      'comments',
      'shares',
      'views',
      'engagement',
      'engagement_rate',
      'ai_score',
      'actions',
    ]);
    expect(optionsOf(columns[1])).toEqual([
      { value: 'sa1', label: 'Duncit Pages' },
      { value: 'sa2', label: 'Duncit Pets' },
    ]);
    expect(optionsOf(columns[2])).toEqual([
      { value: 'LINKEDIN', label: 'LinkedIn' },
      { value: 'FACEBOOK', label: 'Facebook' },
      { value: 'INSTAGRAM', label: 'Instagram' },
      { value: 'X', label: 'X' },
      { value: 'YOUTUBE', label: 'YouTube' },
    ]);
    expect(columns[3].headerName).toBe('Published');
  });

  it('shows a post’s picture, text, network and formatted numbers, with a link out', async () => {
    renderColumns([makePost()]);
    const row = await screen.findByTestId('table-row');
    const post = within(row).getByTestId('cell-text');
    expect(post.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/p1.jpg');
    expect(within(post).getAllByText('Sunday run club recap')).toHaveLength(2);
    expect(within(row).getByTestId('cell-account_id')).toHaveTextContent('Duncit Pages');
    const network = within(row).getByTestId('cell-platform');
    expect(within(network).getByTestId('InstagramIcon')).toBeInTheDocument();
    expect(within(network).getAllByText('Instagram')).toHaveLength(2);
    expect(within(row).getByTestId('cell-likes')).toHaveTextContent('1,234');
    expect(within(row).getByTestId('cell-views')).toHaveTextContent('4,500');
    expect(within(row).getByTestId('cell-engagement_rate')).toHaveTextContent('3.46%');
    expect(within(row).getByTestId('cell-ai_score')).toHaveTextContent('72');
    expect(within(row).getByRole('link', { name: 'Open post' })).toHaveAttribute('href', 'https://instagram.com/p/p1');
  });

  it('falls back to the dash for a text-only post the network gave no views or score for', async () => {
    renderColumns([makePost({ media_url: null, text: null, views: null, ai_score: null, permalink: null })]);
    const row = await screen.findByTestId('table-row');
    const post = within(row).getByTestId('cell-text');
    expect(post.querySelector('img')).toBeNull();
    expect(post).toHaveTextContent(/^—$/);
    expect(within(row).getByTestId('cell-views')).toHaveTextContent(/^—$/);
    expect(within(row).getByTestId('cell-ai_score')).toHaveTextContent(/^—$/);
    expect(within(row).queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('PostAiAnalysis', () => {
  it('invites a first analysis when the post has none', () => {
    renderWithProviders(<PostAiAnalysis postId="p1" analysis={null} />);
    expect(screen.getByText('AI analysis')).toBeInTheDocument();
    expect(screen.getByText('Why this post did as it did, against the account’s own average.')).toBeInTheDocument();
    expect(screen.getByTestId('social-post-analyse')).toHaveTextContent('Analyse with AI');
    expect(screen.queryByTestId('social-post-analysis')).not.toBeInTheDocument();
  });

  it('shows the score, summary, points and the next idea of a kept analysis', () => {
    renderWithProviders(<PostAiAnalysis postId="p1" analysis={makeAnalysis()} />);
    expect(screen.getByText('Analysed fmt:2026-09-02T08:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByTestId('social-post-analyse')).toHaveTextContent('Analyse again');
    const analysis = screen.getByTestId('social-post-analysis');
    expect(within(analysis).getByText('Score 64 / 100')).toBeInTheDocument();
    expect(within(analysis).getByRole('progressbar', { name: 'AI score' })).toHaveAttribute('aria-valuenow', '64');
    expect(within(analysis).getByText('50 is the account’s average post.')).toBeInTheDocument();
    expect(within(analysis).getByText('The reel beat the account average.')).toBeInTheDocument();
    expect(within(analysis).getByRole('heading', { name: 'What worked' })).toBeInTheDocument();
    expect(within(analysis).getByText('Strong hook')).toBeInTheDocument();
    expect(within(analysis).getByRole('heading', { name: 'What to improve' })).toBeInTheDocument();
    expect(within(analysis).getByText('Shorter caption')).toBeInTheDocument();
    expect(within(analysis).getByRole('heading', { name: 'Try next' })).toBeInTheDocument();
    expect(within(analysis).getByText('Post a behind-the-scenes reel')).toBeInTheDocument();
  });

  it('drops the next idea and the timestamp when the analysis has neither', () => {
    renderWithProviders(<PostAiAnalysis postId="p1" analysis={makeAnalysis({ next_idea: null, analyzed_at: null })} />);
    expect(screen.queryByRole('heading', { name: 'Try next' })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Analysed /)).not.toBeInTheDocument();
    expect(screen.getByText('Why this post did as it did, against the account’s own average.')).toBeInTheDocument();
  });

  it('asks the server to analyse this post', async () => {
    const mock = analyzeMock('p1', makeDetail({}, makeAnalysis()));
    const resultFn = vi.fn(() => mock.result as { data: Record<string, unknown> });
    renderWithProviders(<PostAiAnalysis postId="p1" analysis={null} />, { mocks: [{ ...mock, result: resultFn }] });
    fireEvent.click(screen.getByTestId('social-post-analyse'));
    await waitFor(() => expect(resultFn).toHaveBeenCalledTimes(1));
    await flush();
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('reports a refused analysis', async () => {
    renderWithProviders(<PostAiAnalysis postId="p1" analysis={null} />, {
      mocks: [rejection({ query: ANALYZE_SOCIAL_POST, variables: { id: 'p1' } }, 'AI is not configured')],
    });
    fireEvent.click(screen.getByTestId('social-post-analyse'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('AI is not configured', 'error'));
  });
});

describe('PostComments', () => {
  it('counts the comments by sentiment and lists each with the AI’s verdict', () => {
    renderWithProviders(<PostComments detail={makeDetail()} />);
    expect(screen.getByText('Comments')).toBeInTheDocument();
    for (const label of ['Positive: 5', 'Neutral: 2', 'Negative: 1', 'Flagged: 1']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('fmt:2026-09-01T12:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('Clean')).toBeInTheDocument();
    expect(screen.getByText('Positive')).toBeInTheDocument();
    expect(screen.getByText('Loved it!')).toBeInTheDocument();
    expect(screen.getByText('Friendly praise')).toBeInTheDocument();
    expect(screen.queryByText('No comments yet.')).not.toBeInTheDocument();
  });

  it('names the author by handle, then as unknown, and leaves out what the AI has not said', () => {
    const comments = [
      makeComment({ id: 'c1', author_name: null, author_handle: '@riya', text: 'First' }),
      makeComment({
        id: 'c2',
        author_name: null,
        author_handle: null,
        text: 'Second',
        published_at: null,
        ai_status: 'PENDING',
        ai_sentiment: null,
        ai_reason: null,
      }),
    ];
    renderWithProviders(<PostComments detail={makeDetail({}, null, comments)} />);
    expect(screen.getByText('@riya')).toBeInTheDocument();
    expect(screen.getByText('Unknown author')).toBeInTheDocument();
    expect(screen.getByText('Not analysed')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(1);
    expect(screen.getAllByText('Friendly praise')).toHaveLength(1);
    expect(screen.getAllByText(/^fmt:/)).toHaveLength(1);
  });

  it('says so when the post has no comments', () => {
    renderWithProviders(<PostComments detail={makeDetail({}, null, [])} />);
    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
    expect(screen.getByText('Positive: 5')).toBeInTheDocument();
  });
});

describe('PostDetailDrawer', () => {
  it('stays closed and asks for nothing without a post', () => {
    const resultFn = vi.fn();
    renderWithProviders(<PostDetailDrawer postId={null} onClose={vi.fn()} />, {
      mocks: [{ request: { query: SOCIAL_POST, variables: { id: '' } }, result: resultFn }],
    });
    expect(screen.queryByTestId('social-post-detail')).not.toBeInTheDocument();
    expect(resultFn).not.toHaveBeenCalled();
  });

  it('shows progress under a generic title while the post loads', () => {
    renderWithProviders(<PostDetailDrawer postId="p1" onClose={vi.fn()} />, {
      mocks: [{ ...postMock('p1', makeDetail()), delay: 10_000 }],
    });
    const drawer = screen.getByTestId('social-post-detail');
    expect(within(drawer).getByRole('heading', { level: 2, name: 'Posts' })).toBeInTheDocument();
    expect(within(drawer).getByRole('progressbar')).toBeInTheDocument();
    expect(within(drawer).queryByRole('link')).not.toBeInTheDocument();
  });

  it('opens the post with its numbers, analysis and comments, titled by account and network', async () => {
    const onClose = vi.fn();
    renderWithProviders(<PostDetailDrawer postId="p1" onClose={onClose} />, {
      mocks: [postMock('p1', makeDetail({}, makeAnalysis()))],
    });
    const heading = await screen.findByRole('heading', { level: 2, name: 'Duncit Pages · Instagram' });
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', heading.id);
    const drawer = screen.getByTestId('social-post-detail');
    // The loading bar is gone; the only bar left is the AI score.
    expect(within(drawer).getAllByRole('progressbar').map((bar) => bar.getAttribute('aria-label'))).toEqual(['AI score']);
    expect(within(drawer).getByTestId('InstagramIcon')).toBeInTheDocument();
    expect(within(drawer).getByText('fmt:2026-09-01T10:00:00.000Z')).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Open post' })).toHaveAttribute('href', 'https://instagram.com/p/p1');
    expect(drawer.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/p1.jpg');
    expect(within(drawer).getByText('Sunday run club recap')).toBeInTheDocument();
    expect(within(drawer).getByText('Account average: 80')).toBeInTheDocument();
    expect(within(drawer).getByRole('img', { name: 'This post compared with the account’s average' })).toBeInTheDocument();
    expect(within(drawer).getByText('Score 64 / 100')).toBeInTheDocument();
    expect(within(drawer).getByText('Loved it!')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves out the picture, date and link a post does not have', async () => {
    renderWithProviders(<PostDetailDrawer postId="p1" onClose={vi.fn()} />, {
      mocks: [postMock('p1', makeDetail({ media_url: null, published_at: null, permalink: null }))],
    });
    expect(await screen.findByRole('heading', { level: 2, name: 'Duncit Pages · Instagram' })).toBeInTheDocument();
    const drawer = screen.getByTestId('social-post-detail');
    expect(drawer.querySelector('img')).toBeNull();
    expect(within(drawer).queryByRole('link')).not.toBeInTheDocument();
    expect(within(drawer).queryByText(/^fmt:2026-09-01T10/)).not.toBeInTheDocument();
    expect(within(drawer).getByTestId('social-post-analyse')).toHaveTextContent('Analyse with AI');
  });

  it('shows the analysis the AI returns in place', async () => {
    renderWithProviders(<PostDetailDrawer postId="p1" onClose={vi.fn()} />, {
      mocks: [postMock('p1', makeDetail()), analyzeMock('p1', makeDetail({}, makeAnalysis({ score: 81 })))],
    });
    fireEvent.click(await screen.findByTestId('social-post-analyse'));
    expect(await screen.findByText('Score 81 / 100')).toBeInTheDocument();
    expect(screen.getByTestId('social-post-analyse')).toHaveTextContent('Analyse again');
  });

  it('explains a post that could not be loaded', async () => {
    renderWithProviders(<PostDetailDrawer postId="p9" onClose={vi.fn()} />, {
      mocks: [rejection({ query: SOCIAL_POST, variables: { id: 'p9' } }, 'Post not found')],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Post not found');
    expect(screen.getByRole('heading', { level: 2, name: 'Posts' })).toBeInTheDocument();
    expect(screen.queryByTestId('social-post-analyse')).not.toBeInTheDocument();
  });
});
