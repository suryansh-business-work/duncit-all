import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, render, within } from '@testing-library/react';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';

// Same lightweight table stand-in every marketing page spec uses: the column
// factories stay real enough to render `renderExtra` and read `field`.
vi.mock('@duncit/table', () => import('./table-mock'));

import { EnumChip, ReasonCell, ReviewToggle } from '../../src/pages/social-accounts-page/monitoring/CommentCells';
import { getCommentColumns } from '../../src/pages/social-accounts-page/monitoring/commentColumns';
import { VERDICT_COLORS, VERDICT_LABEL } from '../../src/pages/social-accounts-page/copy';
import type { SocialAccount, SocialCommentRow } from '../../src/pages/social-accounts-page/queries';

const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

const makeComment = (over: Partial<SocialCommentRow> = {}): SocialCommentRow => ({
  id: 'c1',
  account_id: 'a1',
  account_name: 'Duncit India',
  platform: 'INSTAGRAM',
  post_text: 'Sunday pickleball',
  post_permalink: 'https://instagram.example/p/1',
  permalink: 'https://instagram.example/c/1',
  author_name: 'Riya',
  author_handle: '@riya',
  text: 'Buy followers here',
  published_at: '2026-10-01T10:00:00.000Z',
  likes: 2,
  ai_status: 'FLAGGED',
  ai_sentiment: 'NEGATIVE',
  ai_categories: ['SPAM', 'MADE_UP_CODE'],
  ai_severity: 'HIGH',
  ai_reason: 'Promotes a paid follower scheme.',
  review_status: 'OPEN',
  ...over,
});

const ACCOUNTS = [{ id: 'a1', name: 'Duncit India' }] as SocialAccount[];

describe('EnumChip', () => {
  it('shows the dash when the AI has no value yet', () => {
    const { container } = render(<EnumChip value={null} colors={VERDICT_COLORS} labels={VERDICT_LABEL} t={t} />);
    expect(container).toHaveTextContent('—');
  });

  it('shows the localized label for a value', () => {
    render(<EnumChip value="CLEAN" colors={VERDICT_COLORS} labels={VERDICT_LABEL} t={t} />);
    expect(screen.getByText('Clean')).toBeInTheDocument();
  });
});

describe('ReasonCell', () => {
  it('shows the dash when there is neither a reason nor a category', () => {
    const { container } = render(<ReasonCell row={makeComment({ ai_reason: null, ai_categories: [] })} t={t} />);
    expect(container).toHaveTextContent(/^—$/);
  });

  it('labels known codes, shows an invented code as sent, and the reason sentence', () => {
    render(<ReasonCell row={makeComment()} t={t} />);
    expect(screen.getByText('Spam')).toBeInTheDocument();
    expect(screen.getByText('MADE_UP_CODE')).toBeInTheDocument();
    expect(screen.getByText('Promotes a paid follower scheme.')).toBeInTheDocument();
  });

  it('shows only the reason when there are no categories', () => {
    const { container } = render(<ReasonCell row={makeComment({ ai_categories: [] })} t={t} />);
    expect(container).toHaveTextContent(/^Promotes a paid follower scheme\.$/);
  });

  it('shows only the chips when there is no reason sentence', () => {
    const { container } = render(<ReasonCell row={makeComment({ ai_reason: null, ai_categories: ['COMPLAINT'] })} t={t} />);
    expect(container).toHaveTextContent(/^Complaint$/);
  });
});

describe('ReviewToggle', () => {
  it('marks an open comment reviewed', () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    const row = makeComment();
    render(<ReviewToggle row={row} onReview={onReview} t={t} />);
    expect(screen.queryByTestId('social-comment-reopen-c1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-comment-review-c1'));
    expect(onReview).toHaveBeenCalledWith(row, 'REVIEWED');
  });

  it('puts a reviewed comment back in the queue', () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    const row = makeComment({ review_status: 'REVIEWED' });
    render(<ReviewToggle row={row} onReview={onReview} t={t} />);
    expect(screen.queryByTestId('social-comment-review-c1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-comment-reopen-c1'));
    expect(onReview).toHaveBeenCalledWith(row, 'OPEN');
  });
});

describe('getCommentColumns', () => {
  type Column = ReturnType<typeof getCommentColumns>[number] & {
    options?: { value: string; label: string }[];
    valueGetter?: (row: SocialCommentRow) => unknown;
    cellRenderer?: (row: SocialCommentRow) => React.ReactNode;
  };
  const build = (onReview = vi.fn().mockResolvedValue(undefined)) =>
    getCommentColumns({ accounts: ACCOUNTS, onReview }, t) as Column[];
  const col = (field: string, columns = build()) => {
    const found = columns.find((c) => c.field === field);
    if (!found) throw new Error(`no column ${field}`);
    return found;
  };

  it('lays out the columns in reading order with localized headers', () => {
    expect(build().map((c) => c.field)).toEqual([
      'text',
      'author_name',
      'ai_status',
      'ai_severity',
      'ai_reason',
      'ai_sentiment',
      'account_id',
      'platform',
      'published_at',
      'review_status',
      'actions',
    ]);
    expect(col('text').headerName).toBe('Comment');
    expect(col('published_at').headerName).toBe(t('marketing.social.colPublished'));
  });

  it('builds filter options from the enums and the connected accounts', () => {
    expect(col('ai_status').options).toEqual([
      { value: 'FLAGGED', label: 'Flagged' },
      { value: 'PENDING', label: 'Not analysed' },
      { value: 'CLEAN', label: 'Clean' },
    ]);
    expect(col('ai_severity').options?.map((o) => o.label)).toEqual(['High', 'Medium', 'Low']);
    expect(col('ai_sentiment').options?.map((o) => o.value)).toEqual(['NEGATIVE', 'NEUTRAL', 'POSITIVE']);
    expect(col('account_id').options).toEqual([{ value: 'a1', label: 'Duncit India' }]);
    expect(col('platform').options).toHaveLength(5);
    expect(col('review_status').options).toEqual([
      { value: 'OPEN', label: 'Open' },
      { value: 'REVIEWED', label: 'Reviewed' },
    ]);
  });

  it('shows the comment with the post it sits on, or alone when there is no post text', () => {
    const text = col('text');
    expect(text.valueGetter?.(makeComment())).toBe('Buy followers here');
    const { unmount } = render(<>{text.cellRenderer?.(makeComment())}</>);
    expect(screen.getByText('Buy followers here')).toBeInTheDocument();
    expect(screen.getByText('On post: Sunday pickleball')).toBeInTheDocument();
    unmount();
    render(<>{text.cellRenderer?.(makeComment({ post_text: null }))}</>);
    expect(screen.queryByText(/On post/)).not.toBeInTheDocument();
  });

  it('names the author by name, then handle, then as unknown', () => {
    const author = col('author_name');
    expect(author.valueGetter?.(makeComment())).toBe('Riya');
    expect(author.valueGetter?.(makeComment({ author_name: null }))).toBe('@riya');
    expect(author.valueGetter?.(makeComment({ author_name: '', author_handle: null }))).toBe('Unknown author');
  });

  it('renders the AI verdict, severity, sentiment and reason cells', () => {
    const row = makeComment();
    expect(col('ai_status').valueGetter?.(row)).toBe('Flagged');
    expect(col('ai_reason').valueGetter?.(row)).toBe('Promotes a paid follower scheme.');
    expect(col('ai_reason').valueGetter?.(makeComment({ ai_reason: null }))).toBe('');
    render(
      <>
        {col('ai_status').cellRenderer?.(row)}
        {col('ai_severity').cellRenderer?.(row)}
        {col('ai_sentiment').cellRenderer?.(row)}
        {col('ai_reason').cellRenderer?.(row)}
      </>,
    );
    expect(screen.getByText('Flagged')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Negative')).toBeInTheDocument();
    expect(screen.getByText('Spam')).toBeInTheDocument();
  });

  it('shows the account name, the network and the review state as text', () => {
    const row = makeComment({ review_status: 'REVIEWED' });
    expect(col('account_id').valueGetter?.(row)).toBe('Duncit India');
    expect(col('platform').valueGetter?.(row)).toBe('Instagram');
    expect(col('review_status').valueGetter?.(row)).toBe('Reviewed');
    render(<>{col('platform').cellRenderer?.(row)}</>);
    expect(screen.getByText('Instagram')).toBeInTheDocument();
  });

  it('offers the review toggle and opens the comment itself on the network', () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    const row = makeComment();
    render(<div data-testid="cell">{col('actions', build(onReview)).cellRenderer?.(row)}</div>);
    fireEvent.click(screen.getByTestId('social-comment-review-c1'));
    expect(onReview).toHaveBeenCalledWith(row, 'REVIEWED');
    expect(within(screen.getByTestId('cell')).getByRole('link')).toHaveAttribute('href', 'https://instagram.example/c/1');
  });

  it('falls back to the post link when the comment has no permalink of its own', () => {
    render(<div data-testid="cell">{col('actions').cellRenderer?.(makeComment({ permalink: null }))}</div>);
    expect(within(screen.getByTestId('cell')).getByRole('link')).toHaveAttribute('href', 'https://instagram.example/p/1');
  });
});
