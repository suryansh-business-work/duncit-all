import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { flush, renderWithProviders } from '../testkit';
import { makeSocialAccount } from '../mocks';
import { __setTableRows } from './table-mock';

const tableMock = vi.hoisted(() => ({ useApolloTableFetch: vi.fn() }));
vi.mock('@duncit/table', async () => {
  const mock = await import('./table-mock');
  tableMock.useApolloTableFetch.mockImplementation(mock.useApolloTableFetch);
  return { ...mock, useApolloTableFetch: tableMock.useApolloTableFetch };
});
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

import MonitoringTab from '../../src/pages/social-accounts-page/monitoring/MonitoringTab';
import {
  ANALYZE_SOCIAL_COMMENTS,
  REVIEW_SOCIAL_COMMENT,
  SOCIAL_COMMENTS_TABLE,
  type SocialAnalysisResult,
  type SocialCommentRow,
} from '../../src/pages/social-accounts-page/queries';

const comment = (over: Partial<SocialCommentRow> = {}): SocialCommentRow => ({
  id: 'c1',
  account_id: 'sa1',
  account_name: 'Duncit Pages',
  platform: 'LINKEDIN',
  post_text: null,
  post_permalink: null,
  permalink: null,
  author_name: 'Asha',
  author_handle: null,
  text: 'This is spam',
  published_at: null,
  likes: 0,
  ai_status: 'FLAGGED',
  ai_sentiment: 'NEGATIVE',
  ai_categories: [],
  ai_severity: 'HIGH',
  ai_reason: null,
  review_status: 'OPEN',
  ...over,
});

const reviewMock = (id: string, status: 'OPEN' | 'REVIEWED'): MockedResponse => ({
  request: { query: REVIEW_SOCIAL_COMMENT, variables: { id, status } },
  result: { data: { reviewSocialComment: { __typename: 'SocialComment', id, review_status: status } } },
});

const analyzeMock = (result: SocialAnalysisResult): MockedResponse => ({
  request: { query: ANALYZE_SOCIAL_COMMENTS },
  result: { data: { analyzeSocialComments: { __typename: 'SocialAnalysisResult', ...result } } },
});

const rejection = (query: MockedResponse['request'], message: string): MockedResponse => ({
  request: query,
  result: { errors: [new GraphQLError(message)] },
});

const ATTENTION = [
  { field: 'ai_status', op: 'eq', value: 'FLAGGED' },
  { field: 'review_status', op: 'eq', value: 'OPEN' },
];

/** Lets the table's (re)mount fetch settle inside act. */
const flushTable = () => act(flush);

const renderTab = (mocks: MockedResponse[] = []) => {
  const onChanged = vi.fn();
  const accounts = [makeSocialAccount({ flagged_open: 2 }), makeSocialAccount({ id: 'sa2', flagged_open: 3 })];
  renderWithProviders(<MonitoringTab accounts={accounts} onChanged={onChanged} />, { mocks });
  return onChanged;
};

beforeEach(() => {
  __setTableRows([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('MonitoringTab', () => {
  it('opens on the needs-attention queue, counting every account’s open flags', async () => {
    renderTab();
    await flushTable();
    const view = screen.getByTestId('social-monitoring-view');
    expect(view).toHaveAttribute('aria-label', 'Comments shown');
    const attention = within(view).getByRole('button', { name: 'Needs attention (5)' });
    expect(attention).toHaveAttribute('aria-pressed', 'true');
    expect(within(view).getByRole('button', { name: 'All comments' })).toHaveAttribute('aria-pressed', 'false');
    expect(tableMock.useApolloTableFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      SOCIAL_COMMENTS_TABLE,
      'socialCommentsTable',
      { extraFilters: ATTENTION },
      ['attention'],
    );
    expect(screen.getByTestId('table-empty')).toHaveTextContent('Nothing needs attention right now.');
  });

  it('switches to every comment without the attention filters', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'All comments' }));
    expect(screen.getByRole('button', { name: 'All comments' })).toHaveAttribute('aria-pressed', 'true');
    expect(tableMock.useApolloTableFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      SOCIAL_COMMENTS_TABLE,
      'socialCommentsTable',
      { extraFilters: [] },
      ['all'],
    );
    await flushTable();
    expect(screen.getByTestId('table-empty')).toHaveTextContent('No comments yet.');
  });

  it('keeps the current view when the selected toggle is pressed again', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Needs attention (5)' }));
    await flushTable();
    expect(screen.getByRole('button', { name: 'Needs attention (5)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('table-empty')).toHaveTextContent('Nothing needs attention right now.');
  });

  it('marks a comment reviewed, then reloads the table and the account counts', async () => {
    __setTableRows([comment()]);
    const onChanged = renderTab([reviewMock('c1', 'REVIEWED')]);
    const review = await screen.findByTestId('social-comment-review-c1');
    expect(screen.getByTestId('cell-text')).toHaveTextContent('This is spam');
    __setTableRows([]);
    fireEvent.click(review);
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('Nothing needs attention right now.');
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('reports a failed review and leaves the list alone', async () => {
    __setTableRows([comment({ review_status: 'REVIEWED' })]);
    const onChanged = renderTab([
      rejection({ query: REVIEW_SOCIAL_COMMENT, variables: { id: 'c1', status: 'OPEN' } }, 'Comment not found'),
    ]);
    fireEvent.click(await screen.findByTestId('social-comment-reopen-c1'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Comment not found', 'error'));
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.getByTestId('cell-text')).toHaveTextContent('This is spam');
  });

  it('confirms how many comments the AI read and flagged', async () => {
    const onChanged = renderTab([analyzeMock({ analyzed: 4, flagged: 1, error: null })]);
    const analyse = screen.getByTestId('social-analyse');
    expect(analyse).toHaveTextContent('Analyse pending');
    fireEvent.click(analyse);
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Analysed 4, flagged 1.', 'success'));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('warns with the AI’s reason when the analysis stopped part-way', async () => {
    const onChanged = renderTab([analyzeMock({ analyzed: 2, flagged: 0, error: 'Quota exceeded' })]);
    fireEvent.click(screen.getByTestId('social-analyse'));
    await waitFor(() =>
      expect(dialogsMock.notify).toHaveBeenCalledWith('AI analysis stopped: Quota exceeded', 'warning'),
    );
    expect(dialogsMock.notify).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('reports zero counts when the server sends back no result', async () => {
    renderTab([{ request: { query: ANALYZE_SOCIAL_COMMENTS }, result: { data: { analyzeSocialComments: null } } }]);
    fireEvent.click(screen.getByTestId('social-analyse'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Analysed 0, flagged 0.', 'success'));
  });

  it('reports an analysis request that failed outright', async () => {
    const onChanged = renderTab([rejection({ query: ANALYZE_SOCIAL_COMMENTS }, 'AI is not configured')]);
    fireEvent.click(screen.getByTestId('social-analyse'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('AI is not configured', 'error'));
    expect(onChanged).not.toHaveBeenCalled();
  });
});
