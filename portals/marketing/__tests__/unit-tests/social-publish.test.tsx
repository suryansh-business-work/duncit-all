import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import {
  gqlSocialScheduledPost,
  makeSocialAccount,
  makeSocialCalendarItem,
  makeSocialPublishTarget,
  makeSocialScheduledPost,
  socialCalendarMock,
  socialScheduledPostMock,
  socialScheduledPostsMock,
} from '../mocks';

// The admin-zone clock: a fixed "now", a day key read off the ISO instant and
// a readable stamp, so dates in the cards and the calendar are deterministic.
const clock = vi.hoisted(() => ({
  now: () => new Date('2026-09-15T08:00:00.000Z'),
  dayKey: (value: Date | string) => (typeof value === 'string' ? value : value.toISOString()).slice(0, 10),
  formatTime: (value: string) => `at ${value.slice(11, 16)}`,
  formatDateTime: (value: string) => `on ${value.slice(0, 10)} ${value.slice(11, 16)}`,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => clock,
}));

const dialogsMock = vi.hoisted(() => ({ confirm: vi.fn(), notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => dialogsMock.confirm,
  notify: dialogsMock.notify,
}));

vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  MediaListField: (await import('../mocks/media-list-field.mock')).MediaListFieldStub,
}));

import {
  CREATE_SCHEDULED_SOCIAL_POST,
  DELETE_SCHEDULED_SOCIAL_POST,
  RETRY_SCHEDULED_SOCIAL_POST,
  SHARE_SCHEDULED_SOCIAL_POST_NOW,
  SOCIAL_SCHEDULED_POST,
  SOCIAL_SCHEDULED_POSTS,
  UPDATE_SCHEDULED_SOCIAL_POST,
  type SocialPostMedia,
  type SocialScheduledPostInput,
} from '../../src/pages/social-accounts-page/publish.queries';
import { gridRange, monthWeeks } from '../../src/pages/social-accounts-page/publish/calendar-grid';
import ScheduledPostCard from '../../src/pages/social-accounts-page/publish/ScheduledPostCard';
import QueueList from '../../src/pages/social-accounts-page/publish/QueueList';
import PlannedPostDialog from '../../src/pages/social-accounts-page/publish/PlannedPostDialog';
import PublishTab from '../../src/pages/social-accounts-page/publish/PublishTab';
import ComposerDialog from '../../src/pages/social-accounts-page/publish/ComposerDialog';

const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

const IMAGE_URL = 'https://ik.imagekit.io/duncit/run.jpg';
const VIDEO_URL = 'https://ik.imagekit.io/duncit/run.mp4';
const SECOND_URL = 'https://ik.imagekit.io/duncit/run-2.jpg';
const CAROUSEL: SocialPostMedia[] = [
  { url: IMAGE_URL, type: 'IMAGE' },
  { url: VIDEO_URL, type: 'VIDEO' },
  { url: SECOND_URL, type: 'IMAGE' },
];

beforeEach(() => {
  dialogsMock.confirm.mockReset();
  dialogsMock.notify.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

const rejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

const idMutation = (query: MockedResponse['request']['query'], id: string, field: string, value: unknown) => {
  const result = vi.fn(() => ({ data: { [field]: value } }));
  return { result, mock: { request: { query, variables: { id } }, result } as MockedResponse };
};

describe('ScheduledPostCard', () => {
  it('shows when a scheduled post goes out, its text, each target and the actions a scheduled post has', () => {
    const onEdit = vi.fn();
    const post = makeSocialScheduledPost();
    renderWithProviders(<ScheduledPostCard post={post} onEdit={onEdit} />);
    const card = screen.getByTestId('social-scheduled-sp1');
    expect(within(card).getByText(t('marketing.social.publishScheduled'))).toBeInTheDocument();
    expect(within(card).getByText('Goes out on 2026-09-20 10:00')).toBeInTheDocument();
    expect(within(card).getByText('Run club this Sunday')).toBeInTheDocument();
    expect(within(card).getByText('Duncit Pages · Waiting')).toBeInTheDocument();
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
    expect(card.querySelector('img')).toBeNull();
    expect(within(card).queryByTestId('social-media-count')).not.toBeInTheDocument();
    expect(within(card).queryByTestId('social-post-review-note')).not.toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: t('marketing.social.retryFailed') })).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole('button', { name: t('shell.common.edit') }));
    expect(onEdit).toHaveBeenCalledWith(post);
    expect(within(card).getByRole('button', { name: t('marketing.social.shareNow') })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: t('shell.common.delete') })).toBeInTheDocument();
  });

  it('says when a sent post went out, shows the single picture of a post written before carousels, and links each network it landed on', () => {
    const post = makeSocialScheduledPost({
      status: 'PUBLISHED',
      published_at: '2026-09-14T18:30:00.000Z',
      media_url: IMAGE_URL,
      media_type: 'IMAGE',
      targets: [makeSocialPublishTarget({ status: 'PUBLISHED', permalink: 'https://www.linkedin.com/feed/update/1' })],
    });
    renderWithProviders(<ScheduledPostCard post={post} onEdit={vi.fn()} />);
    const card = screen.getByTestId('social-scheduled-sp1');
    expect(within(card).getByText('Sent on 2026-09-14 18:30')).toBeInTheDocument();
    const link = within(card).getByRole('link');
    expect(link).toHaveAttribute('href', 'https://www.linkedin.com/feed/update/1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(link).getByText('Duncit Pages · Posted')).toBeInTheDocument();
    expect(card.querySelector('img')).toHaveAttribute('src', IMAGE_URL);
    expect(within(card).queryByTestId('social-media-count')).not.toBeInTheDocument();
    // A sent post can only be deleted — not edited, shared again or retried.
    expect(within(card).getAllByRole('button').map((button) => button.textContent)).toEqual([t('shell.common.delete')]);
  });

  it('shows a carousel by its first item with a count of the rest', () => {
    const post = makeSocialScheduledPost({ media: CAROUSEL, media_url: IMAGE_URL, media_type: 'IMAGE' });
    renderWithProviders(<ScheduledPostCard post={post} onEdit={vi.fn()} />);
    const card = screen.getByTestId('social-scheduled-sp1');
    expect(card.querySelectorAll('img')).toHaveLength(1);
    expect(card.querySelector('img')).toHaveAttribute('src', IMAGE_URL);
    expect(within(card).getByTestId('social-media-count')).toHaveTextContent(t('marketing.social.mediaCount', { count: 3 }));
    expect(within(card).queryByTestId('social-media-strip')).not.toBeInTheDocument();
  });

  it('marks a video with an icon, an undated draft as such, and empty text with a dash', () => {
    const post = makeSocialScheduledPost({
      status: 'DRAFT',
      scheduled_at: null,
      text: '',
      media: [{ url: VIDEO_URL, type: 'VIDEO' }],
      media_url: VIDEO_URL,
      media_type: 'VIDEO',
    });
    renderWithProviders(<ScheduledPostCard post={post} onEdit={vi.fn()} />);
    const card = screen.getByTestId('social-scheduled-sp1');
    expect(within(card).getByText(t('marketing.social.noDateYet'))).toBeInTheDocument();
    expect(within(card).getByText('—')).toBeInTheDocument();
    expect(card.querySelector('img')).toBeNull();
    expect(within(card).getByTestId('social-media-video')).toBeInTheDocument();
    expect(within(card).getByTestId('VideocamOutlinedIcon')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: t('shell.common.edit') })).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: t('marketing.social.shareNow') })).not.toBeInTheDocument();
  });

  it('parks a post awaiting approval: its own chip, a way to the Approvals page, edit but no share', () => {
    const onEdit = vi.fn();
    const post = makeSocialScheduledPost({ status: 'PENDING_APPROVAL', needs_approval: true, approval_run_id: 'run9' });
    renderWithProviders(<ScheduledPostCard post={post} onEdit={onEdit} />);
    const card = screen.getByTestId('social-scheduled-sp1');
    expect(within(card).getByText(t('marketing.social.publishPendingApproval'))).toBeInTheDocument();
    const open = within(card).getByTestId('social-open-approvals');
    expect(open).toHaveAttribute('href', '/approvals');
    expect(open).toHaveTextContent(t('marketing.social.openApprovals'));
    expect(within(card).queryByRole('button', { name: t('marketing.social.shareNow') })).not.toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: t('marketing.social.retryFailed') })).not.toBeInTheDocument();
    expect(within(card).getByRole('button', { name: t('shell.common.delete') })).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: t('shell.common.edit') }));
    expect(onEdit).toHaveBeenCalledWith(post);
  });

  it('shows the reviewer’s note on a draft that came back, and not once the post is on its way again', () => {
    const { unmount } = renderWithProviders(
      <ScheduledPostCard post={makeSocialScheduledPost({ status: 'DRAFT', review_note: 'Add a call to action' })} onEdit={vi.fn()} />,
    );
    const note = screen.getByTestId('social-post-review-note');
    expect(note).toHaveTextContent(t('marketing.social.sentBack', { vars: { note: 'Add a call to action' } }));
    expect(note.className).toMatch(/Warning/);
    unmount();

    renderWithProviders(<ScheduledPostCard post={makeSocialScheduledPost({ status: 'SCHEDULED', review_note: 'Add a call to action' })} onEdit={vi.fn()} />);
    expect(screen.queryByTestId('social-post-review-note')).not.toBeInTheDocument();
    expect(screen.queryByText(/Add a call to action/)).not.toBeInTheDocument();
  });

  it('lists why each failed network failed and offers a retry, but not targets that failed without a reason', () => {
    const post = makeSocialScheduledPost({
      status: 'PARTIAL',
      targets: [
        makeSocialPublishTarget({ status: 'PUBLISHED' }),
        makeSocialPublishTarget({ account_id: 'sa2', account_name: 'Duncit X', platform: 'X', status: 'FAILED', error: 'Text too long' }),
        makeSocialPublishTarget({ account_id: 'sa3', account_name: 'Duncit FB', platform: 'FACEBOOK', status: 'FAILED', error: null }),
      ],
    });
    renderWithProviders(<ScheduledPostCard post={post} onEdit={vi.fn()} />);
    const card = screen.getByTestId('social-scheduled-sp1');
    expect(within(card).getByText('Duncit X: Text too long')).toBeInTheDocument();
    expect(within(card).queryByText(/^Duncit FB:/)).not.toBeInTheDocument();
    expect(within(card).getByText('Duncit FB · Failed')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: t('marketing.social.retryFailed') })).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: t('shell.common.edit') })).not.toBeInTheDocument();
  });

  it('offers nothing to press while a post is going out', () => {
    renderWithProviders(<ScheduledPostCard post={makeSocialScheduledPost({ status: 'PUBLISHING' })} onEdit={vi.fn()} />);
    expect(within(screen.getByTestId('social-scheduled-sp1')).queryAllByRole('button')).toHaveLength(0);
  });

  it('shares a scheduled post now and says it is sending', async () => {
    const share = idMutation(
      SHARE_SCHEDULED_SOCIAL_POST_NOW,
      'sp1',
      'shareScheduledSocialPostNow',
      gqlSocialScheduledPost(makeSocialScheduledPost({ status: 'PUBLISHING' })),
    );
    renderWithProviders(<ScheduledPostCard post={makeSocialScheduledPost()} onEdit={vi.fn()} />, { mocks: [share.mock] });
    fireEvent.click(screen.getByRole('button', { name: t('marketing.social.shareNow') }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.publishingNow'), 'success'));
    expect(share.result).toHaveBeenCalledTimes(1);
  });

  it('retries a failed post and reports the server refusing it', async () => {
    renderWithProviders(<ScheduledPostCard post={makeSocialScheduledPost({ status: 'FAILED' })} onEdit={vi.fn()} />, {
      mocks: [{ request: { query: RETRY_SCHEDULED_SOCIAL_POST, variables: { id: 'sp1' } }, ...rejection('Account needs reconnecting') }],
    });
    fireEvent.click(screen.getByRole('button', { name: t('marketing.social.retryFailed') }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Account needs reconnecting', 'error'));
    expect(dialogsMock.notify).not.toHaveBeenCalledWith(expect.anything(), 'success');
  });

  it('retries a failed post and says it is retrying', async () => {
    const retry = idMutation(
      RETRY_SCHEDULED_SOCIAL_POST,
      'sp1',
      'retryScheduledSocialPost',
      gqlSocialScheduledPost(makeSocialScheduledPost({ status: 'PUBLISHING' })),
    );
    renderWithProviders(<ScheduledPostCard post={makeSocialScheduledPost({ status: 'FAILED' })} onEdit={vi.fn()} />, { mocks: [retry.mock] });
    fireEvent.click(screen.getByRole('button', { name: t('marketing.social.retryFailed') }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.retrying'), 'success'));
    expect(retry.result).toHaveBeenCalledTimes(1);
  });

  it('asks before deleting and does nothing when the marketer backs out', async () => {
    dialogsMock.confirm.mockResolvedValue(false);
    const remove = idMutation(DELETE_SCHEDULED_SOCIAL_POST, 'sp1', 'deleteScheduledSocialPost', true);
    const onRemoved = vi.fn();
    renderWithProviders(<ScheduledPostCard post={makeSocialScheduledPost()} onEdit={vi.fn()} onRemoved={onRemoved} />, { mocks: [remove.mock] });
    fireEvent.click(screen.getByRole('button', { name: t('shell.common.delete') }));
    await waitFor(() =>
      expect(dialogsMock.confirm).toHaveBeenCalledWith({
        title: t('marketing.social.deletePostTitle'),
        message: t('marketing.social.deletePostMessage'),
        destructive: true,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(remove.result).not.toHaveBeenCalled();
    expect(onRemoved).not.toHaveBeenCalled();
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('deletes on confirm, says so and tells the dialog around it', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    const remove = idMutation(DELETE_SCHEDULED_SOCIAL_POST, 'sp1', 'deleteScheduledSocialPost', true);
    const onRemoved = vi.fn();
    renderWithProviders(<ScheduledPostCard post={makeSocialScheduledPost()} onEdit={vi.fn()} onRemoved={onRemoved} />, { mocks: [remove.mock] });
    fireEvent.click(screen.getByRole('button', { name: t('shell.common.delete') }));
    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1));
    expect(remove.result).toHaveBeenCalledTimes(1);
    expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.postDeleted'), 'success');
  });

  it('keeps the card when the delete fails, and reports why', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    const onRemoved = vi.fn();
    renderWithProviders(<ScheduledPostCard post={makeSocialScheduledPost()} onEdit={vi.fn()} onRemoved={onRemoved} />, {
      mocks: [{ request: { query: DELETE_SCHEDULED_SOCIAL_POST, variables: { id: 'sp1' } }, ...rejection('Already sent') }],
    });
    fireEvent.click(screen.getByRole('button', { name: t('shell.common.delete') }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Already sent', 'error'));
    expect(onRemoved).not.toHaveBeenCalled();
  });

  it('deletes from a list card that has no dialog to close', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    const remove = idMutation(DELETE_SCHEDULED_SOCIAL_POST, 'sp1', 'deleteScheduledSocialPost', true);
    renderWithProviders(<ScheduledPostCard post={makeSocialScheduledPost()} onEdit={vi.fn()} />, { mocks: [remove.mock] });
    fireEvent.click(screen.getByRole('button', { name: t('shell.common.delete') }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.postDeleted'), 'success'));
    expect(remove.result).toHaveBeenCalledTimes(1);
  });
});

describe('QueueList', () => {
  it('shows a progress bar while the list loads, then a card per post', async () => {
    const onEdit = vi.fn();
    const first = makeSocialScheduledPost();
    const second = makeSocialScheduledPost({ id: 'sp2', text: 'Monsoon pods' });
    renderWithProviders(<QueueList view="QUEUE" onEdit={onEdit} />, { mocks: [socialScheduledPostsMock('QUEUE', [first, second])] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    const list = await screen.findByTestId('social-queue-queue');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(list).getByTestId('social-scheduled-sp1')).toBeInTheDocument();
    expect(within(list).getByTestId('social-scheduled-sp2')).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId('social-scheduled-sp2')).getByRole('button', { name: t('shell.common.edit') }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'sp2', text: 'Monsoon pods' }));
  });

  it('lists the posts waiting for a manager, with their media', async () => {
    const parked = makeSocialScheduledPost({ id: 'pa1', status: 'PENDING_APPROVAL', needs_approval: true, media: CAROUSEL, media_url: IMAGE_URL, media_type: 'IMAGE' });
    renderWithProviders(<QueueList view="APPROVALS" onEdit={vi.fn()} />, { mocks: [socialScheduledPostsMock('APPROVALS', [parked])] });
    const list = await screen.findByTestId('social-queue-approvals');
    const card = within(list).getByTestId('social-scheduled-pa1');
    expect(within(card).getByText(t('marketing.social.publishPendingApproval'))).toBeInTheDocument();
    expect(within(card).getByTestId('social-media-count')).toHaveTextContent(t('marketing.social.mediaCount', { count: 3 }));
    expect(within(card).getByTestId('social-open-approvals')).toHaveAttribute('href', '/approvals');
  });

  it.each([
    ['QUEUE', 'marketing.social.emptyQueue'],
    ['APPROVALS', 'marketing.social.emptyApprovals'],
    ['DRAFTS', 'marketing.social.emptyDrafts'],
    ['SENT', 'marketing.social.emptySent'],
  ] as const)('tells the marketer when the %s list is empty', async (view, key) => {
    renderWithProviders(<QueueList view={view} onEdit={vi.fn()} />, { mocks: [socialScheduledPostsMock(view, [])] });
    const empty = await screen.findByTestId(`social-queue-empty-${view.toLowerCase()}`);
    expect(empty).toHaveAccessibleName(t(key));
    expect(screen.queryByTestId(`social-queue-${view.toLowerCase()}`)).not.toBeInTheDocument();
    const body = within(empty).queryByText(t('marketing.social.emptyApprovalsBody'));
    // Only the approvals list explains how a post gets there.
    if (view === 'APPROVALS') expect(body).toBeInTheDocument();
    else expect(body).not.toBeInTheDocument();
  });

  it('shows the server error when the list cannot load', async () => {
    renderWithProviders(<QueueList view="SENT" onEdit={vi.fn()} />, {
      mocks: [{ request: { query: SOCIAL_SCHEDULED_POSTS, variables: { view: 'SENT' } }, ...rejection('Publishing is down') }],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Publishing is down');
  });

  it('follows a post that is going out until it lands, then stops asking', async () => {
    vi.useFakeTimers();
    const sending = vi.fn(() => ({ data: { socialScheduledPosts: [gqlSocialScheduledPost(makeSocialScheduledPost({ status: 'PUBLISHING' }))] } }));
    const landed = vi.fn(() => ({
      data: { socialScheduledPosts: [gqlSocialScheduledPost(makeSocialScheduledPost({ status: 'PUBLISHED', published_at: '2026-09-15T08:00:05.000Z' }))] },
    }));
    renderWithProviders(<QueueList view="QUEUE" onEdit={vi.fn()} />, {
      mocks: [
        { request: { query: SOCIAL_SCHEDULED_POSTS, variables: { view: 'QUEUE' } }, result: sending },
        { request: { query: SOCIAL_SCHEDULED_POSTS, variables: { view: 'QUEUE' } }, result: landed },
      ],
    });
    await act(() => vi.advanceTimersByTimeAsync(10));
    const card = screen.getByTestId('social-scheduled-sp1');
    expect(within(card).getByText(t('marketing.social.publishPublishing'))).toBeInTheDocument();
    expect(landed).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(landed).toHaveBeenCalledTimes(1);
    expect(within(screen.getByTestId('social-scheduled-sp1')).getByText(t('marketing.social.publishPublished'))).toBeInTheDocument();

    // Polling stopped: a further poll would hit the exhausted mocks and show an error.
    await act(() => vi.advanceTimersByTimeAsync(15_000));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(sending).toHaveBeenCalledTimes(1);
    expect(landed).toHaveBeenCalledTimes(1);
  });
});

describe('PlannedPostDialog', () => {
  it('stays closed and asks for nothing without a post', () => {
    renderWithProviders(<PlannedPostDialog postId={null} onEdit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('loads the picked post into a card and hands it to the composer on Edit', async () => {
    const post = makeSocialScheduledPost();
    const onEdit = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<PlannedPostDialog postId="sp1" onEdit={onEdit} onClose={onClose} />, { mocks: [socialScheduledPostMock(post)] });
    const dialog = screen.getByRole('dialog', { name: t('marketing.social.plannedPost') });
    expect(within(dialog).getByRole('progressbar')).toBeInTheDocument();
    const card = await within(dialog).findByTestId('social-scheduled-sp1');
    expect(within(dialog).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(dialog).queryByTestId('social-media-strip')).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: t('shell.common.edit') }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'sp1', text: 'Run club this Sunday' }));
  });

  it('shows every item of a carousel under its card, in order', async () => {
    const post = makeSocialScheduledPost({ media: CAROUSEL, media_url: IMAGE_URL, media_type: 'IMAGE' });
    renderWithProviders(<PlannedPostDialog postId="sp1" onEdit={vi.fn()} onClose={vi.fn()} />, { mocks: [socialScheduledPostMock(post)] });
    const strip = await screen.findByTestId('social-media-strip');
    expect(strip).toHaveAccessibleName(t('marketing.social.mediaStripLabel'));
    const items = within(strip).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0].querySelector('img')).toHaveAttribute('src', IMAGE_URL);
    expect(within(items[1]).getByTestId('social-media-video')).toBeInTheDocument();
    expect(items[2].querySelector('img')).toHaveAttribute('src', SECOND_URL);
  });

  it('closes after the post is deleted, and from its Close button', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    const remove = idMutation(DELETE_SCHEDULED_SOCIAL_POST, 'sp1', 'deleteScheduledSocialPost', true);
    const onClose = vi.fn();
    renderWithProviders(<PlannedPostDialog postId="sp1" onEdit={vi.fn()} onClose={onClose} />, {
      mocks: [socialScheduledPostMock(makeSocialScheduledPost()), remove.mock],
    });
    const card = await screen.findByTestId('social-scheduled-sp1');
    fireEvent.click(screen.getByRole('button', { name: t('shell.common.close') }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(within(card).getByRole('button', { name: t('shell.common.delete') }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
    expect(remove.result).toHaveBeenCalledTimes(1);
  });

  it('shows the server error when the post cannot load', async () => {
    renderWithProviders(<PlannedPostDialog postId="sp9" onEdit={vi.fn()} onClose={vi.fn()} />, {
      mocks: [{ request: { query: SOCIAL_SCHEDULED_POST, variables: { id: 'sp9' } }, ...rejection('Post not found') }],
    });
    expect(await screen.findByText('Post not found')).toBeInTheDocument();
    expect(screen.queryByTestId('social-scheduled-sp9')).not.toBeInTheDocument();
  });
});

describe('PublishTab', () => {
  const september = (items = [makeSocialCalendarItem()]) => socialCalendarMock(gridRange(monthWeeks('2026-09')), items);

  it('opens on the calendar and starts a blank post or one dated on a picked day', async () => {
    const onCompose = vi.fn();
    renderWithProviders(<PublishTab onCompose={onCompose} onOpenPost={vi.fn()} />, { mocks: [september([])] });
    expect(screen.getByTestId('social-calendar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('marketing.social.viewCalendar') })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('social-create-post'));
    expect(onCompose).toHaveBeenLastCalledWith({});

    fireEvent.click(screen.getByTestId('social-calendar-add-2026-09-20'));
    expect(onCompose).toHaveBeenLastCalledWith({ scheduled_at: new Date(2026, 8, 20, 10).toISOString() });
  });

  it('opens a network post by id and a Duncit post in the planned-post dialog, whose Edit composes it', async () => {
    const onCompose = vi.fn();
    const onOpenPost = vi.fn();
    renderWithProviders(<PublishTab onCompose={onCompose} onOpenPost={onOpenPost} />, {
      mocks: [
        september([makeSocialCalendarItem(), makeSocialCalendarItem({ id: 'np1', kind: 'PUBLISHED', status: 'PUBLISHED', at: '2026-09-10T09:00:00.000Z' })]),
        socialScheduledPostMock(makeSocialScheduledPost({ id: 'c1' })),
      ],
    });
    fireEvent.click(await screen.findByTestId('social-calendar-item-np1'));
    expect(onOpenPost).toHaveBeenCalledWith('np1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('social-calendar-item-c1'));
    expect(onOpenPost).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole('dialog', { name: t('marketing.social.plannedPost') });
    const card = await within(dialog).findByTestId('social-scheduled-c1');
    fireEvent.click(within(card).getByRole('button', { name: t('shell.common.edit') }));
    expect(onCompose).toHaveBeenCalledWith({ post: expect.objectContaining({ id: 'c1' }) });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('offers the calendar and the four lists, switches to a list, keeps it when pressed again, and edits from it', async () => {
    const onCompose = vi.fn();
    renderWithProviders(<PublishTab onCompose={onCompose} onOpenPost={vi.fn()} />, {
      mocks: [september([]), socialScheduledPostsMock('DRAFTS', [makeSocialScheduledPost({ id: 'd1', status: 'DRAFT' })])],
    });
    const group = screen.getByRole('group', { name: t('marketing.social.publishView') });
    expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual([
      t('marketing.social.viewCalendar'),
      t('marketing.social.viewQueue'),
      t('marketing.social.viewApprovals'),
      t('marketing.social.viewDrafts'),
      t('marketing.social.viewSent'),
    ]);
    const drafts = within(group).getByRole('button', { name: t('marketing.social.viewDrafts') });
    fireEvent.click(drafts);
    const list = await screen.findByTestId('social-queue-drafts');
    expect(screen.queryByTestId('social-calendar')).not.toBeInTheDocument();

    fireEvent.click(drafts);
    expect(drafts).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('social-queue-drafts')).toBeInTheDocument();

    fireEvent.click(within(list).getByRole('button', { name: t('shell.common.edit') }));
    expect(onCompose).toHaveBeenCalledWith({ post: expect.objectContaining({ id: 'd1', status: 'DRAFT' }) });
  });

  it('opens the list of posts awaiting approval', async () => {
    renderWithProviders(<PublishTab onCompose={vi.fn()} onOpenPost={vi.fn()} />, {
      mocks: [september([]), socialScheduledPostsMock('APPROVALS', [makeSocialScheduledPost({ id: 'pa1', status: 'PENDING_APPROVAL', needs_approval: true })])],
    });
    fireEvent.click(screen.getByRole('button', { name: t('marketing.social.viewApprovals') }));
    const list = await screen.findByTestId('social-queue-approvals');
    expect(within(list).getByTestId('social-scheduled-pa1')).toBeInTheDocument();
  });
});

describe('ComposerDialog', () => {
  const accounts = [makeSocialAccount()];
  const createMock = (input: SocialScheduledPostInput) => {
    const result = vi.fn(() => ({ data: { createScheduledSocialPost: gqlSocialScheduledPost(makeSocialScheduledPost({ id: 'new1', status: 'DRAFT' })) } }));
    return { result, mock: { request: { query: CREATE_SCHEDULED_SOCIAL_POST, variables: { input } }, result } as MockedResponse };
  };
  const updateMock = (id: string, input: SocialScheduledPostInput, returned = makeSocialScheduledPost({ id })) => {
    const result = vi.fn(() => ({ data: { updateScheduledSocialPost: gqlSocialScheduledPost(returned) } }));
    return { result, mock: { request: { query: UPDATE_SCHEDULED_SOCIAL_POST, variables: { id, input } }, result } as MockedResponse };
  };
  /** A new post opened with everything a request can carry: an idea's text and picture, and a day's time. */
  const opened = { text: 'Fresh idea', media_url: IMAGE_URL, scheduled_at: '2026-09-20T10:00:00.000Z' };
  const draftInput = (over: Partial<SocialScheduledPostInput> = {}): SocialScheduledPostInput => ({
    text: 'Fresh idea',
    media: [{ url: IMAGE_URL, type: 'IMAGE' }],
    account_ids: [],
    mode: 'DRAFT',
    scheduled_at: '2026-09-20T10:00:00.000Z',
    idea_id: null,
    needs_approval: false,
    reel_project_id: null,
    ...over,
  });
  const mediaBox = (dialog: HTMLElement) => within(dialog).getByRole('textbox', { name: t('marketing.social.postMedia') });
  const approval = (dialog: HTMLElement) => within(dialog).getByRole('switch', { name: t('marketing.social.needsApproval') });

  it('renders nothing while there is no request', () => {
    renderWithProviders(<ComposerDialog request={null} accounts={accounts} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts a new post from what it was opened with — the idea’s picture as its first item — and saves it as a draft linked to the idea', async () => {
    const onClose = vi.fn();
    const create = createMock(draftInput({ idea_id: 'i7' }));
    renderWithProviders(
      <ComposerDialog request={{ ...opened, idea_id: 'i7' }} accounts={accounts} onClose={onClose} />,
      { mocks: [create.mock] },
    );
    const dialog = screen.getByRole('dialog', { name: t('marketing.social.createPost') });
    expect(within(dialog).getByRole('textbox', { name: t('marketing.social.postText') })).toHaveValue('Fresh idea');
    expect(mediaBox(dialog)).toHaveValue(IMAGE_URL);
    expect(approval(dialog)).not.toBeChecked();
    expect(within(dialog).queryByTestId('social-post-sent-back')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('social-post-draft'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(create.result).toHaveBeenCalledTimes(1);
    expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.draftSaved'), 'success');
  });

  it('starts from an idea that brings only text, with no media and no time', async () => {
    const onClose = vi.fn();
    const create = createMock(draftInput({ text: 'Plain idea', media: [], scheduled_at: null, idea_id: 'i9' }));
    renderWithProviders(<ComposerDialog request={{ text: 'Plain idea', idea_id: 'i9' }} accounts={accounts} onClose={onClose} />, { mocks: [create.mock] });
    const dialog = screen.getByRole('dialog', { name: t('marketing.social.createPost') });
    expect(mediaBox(dialog)).toHaveValue('');
    fireEvent.click(within(dialog).getByTestId('social-post-draft'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(create.result).toHaveBeenCalledTimes(1);
  });

  it('links a post written from a reel to that reel', async () => {
    const onClose = vi.fn();
    const create = createMock(draftInput({ text: 'Jam night recap', reel_project_id: 'DUN-REEL-1' }));
    renderWithProviders(
      <ComposerDialog request={{ ...opened, text: 'Jam night recap', reel_project_id: 'DUN-REEL-1' }} accounts={accounts} onClose={onClose} />,
      { mocks: [create.mock] },
    );
    fireEvent.click(within(screen.getByRole('dialog', { name: t('marketing.social.createPost') })).getByTestId('social-post-draft'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(create.result).toHaveBeenCalledTimes(1);
  });

  it('starts from a calendar day with only its time and still asks for something to post', async () => {
    renderWithProviders(<ComposerDialog request={{ scheduled_at: '2026-09-20T10:00:00.000Z' }} accounts={accounts} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: t('marketing.social.createPost') });
    expect(within(dialog).getByRole('textbox', { name: t('marketing.social.postText') })).toHaveValue('');
    fireEvent.click(within(dialog).getByTestId('social-post-draft'));
    expect(await within(dialog).findByText(t('marketing.social.writeSomething'))).toBeInTheDocument();
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('edits an existing post with its own accounts, sends it now and keeps its idea', async () => {
    const onClose = vi.fn();
    const post = makeSocialScheduledPost({ idea_id: 'i3', text: 'Edited copy', scheduled_at: null });
    const update = updateMock(
      'sp1',
      { text: 'Edited copy', media: [], account_ids: ['sa1'], mode: 'NOW', scheduled_at: null, idea_id: 'i3', needs_approval: false, reel_project_id: null },
      { ...post, status: 'PUBLISHING' },
    );
    renderWithProviders(<ComposerDialog request={{ post, idea_id: 'ignored' }} accounts={accounts} onClose={onClose} />, { mocks: [update.mock] });
    const dialog = screen.getByRole('dialog', { name: t('marketing.social.editPost') });
    expect(within(dialog).getByRole('checkbox', { name: 'Duncit Pages' })).toBeChecked();
    fireEvent.click(within(dialog).getByTestId('social-post-now'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(update.result).toHaveBeenCalledTimes(1);
    expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.publishingNow'), 'success');
  });

  it('schedules a post written before carousels by its single URL, falling back to the opened idea', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T08:00:00.000Z'));
    const onClose = vi.fn();
    const post = makeSocialScheduledPost({ media_url: IMAGE_URL, media_type: 'IMAGE' });
    const update = updateMock('sp1', {
      text: 'Run club this Sunday',
      media: [{ url: IMAGE_URL, type: 'IMAGE' }],
      account_ids: ['sa1'],
      mode: 'SCHEDULE',
      scheduled_at: '2026-09-20T10:00:00.000Z',
      idea_id: 'i5',
      needs_approval: false,
      reel_project_id: null,
    });
    renderWithProviders(<ComposerDialog request={{ post, idea_id: 'i5' }} accounts={accounts} onClose={onClose} />, { mocks: [update.mock] });
    const dialog = screen.getByRole('dialog', { name: t('marketing.social.editPost') });
    expect(mediaBox(dialog)).toHaveValue(IMAGE_URL);
    fireEvent.click(screen.getByTestId('social-post-schedule'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(update.result).toHaveBeenCalledTimes(1);
    expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.postScheduled'), 'success');
  });

  it('sends a scheduled post for approval and says so', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T08:00:00.000Z'));
    const onClose = vi.fn();
    const post = makeSocialScheduledPost();
    const update = updateMock(
      'sp1',
      { text: 'Run club this Sunday', media: [], account_ids: ['sa1'], mode: 'SCHEDULE', scheduled_at: '2026-09-20T10:00:00.000Z', idea_id: null, needs_approval: true, reel_project_id: null },
      { ...post, status: 'PENDING_APPROVAL', needs_approval: true, approval_run_id: 'run1' },
    );
    renderWithProviders(<ComposerDialog request={{ post }} accounts={accounts} onClose={onClose} />, { mocks: [update.mock] });
    const dialog = screen.getByRole('dialog', { name: t('marketing.social.editPost') });
    fireEvent.click(approval(dialog));
    const schedule = within(dialog).getByTestId('social-post-schedule');
    expect(schedule).toHaveTextContent(t('marketing.social.sendForApproval'));
    fireEvent.click(schedule);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(update.result).toHaveBeenCalledTimes(1);
    expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.sentForApproval'), 'success');
    expect(dialogsMock.notify).not.toHaveBeenCalledWith(t('marketing.social.postScheduled'), 'success');
  });

  it('opens a parked carousel with every item and its approval flag, and a draft of it is only a draft', async () => {
    const onClose = vi.fn();
    const post = makeSocialScheduledPost({ status: 'PENDING_APPROVAL', needs_approval: true, media: CAROUSEL, media_url: IMAGE_URL, media_type: 'IMAGE' });
    const update = updateMock(
      'sp1',
      { text: 'Run club this Sunday', media: CAROUSEL, account_ids: ['sa1'], mode: 'DRAFT', scheduled_at: '2026-09-20T10:00:00.000Z', idea_id: null, needs_approval: true, reel_project_id: null },
      { ...post, status: 'DRAFT' },
    );
    renderWithProviders(<ComposerDialog request={{ post }} accounts={accounts} onClose={onClose} />, { mocks: [update.mock] });
    const dialog = screen.getByRole('dialog', { name: t('marketing.social.editPost') });
    expect(mediaBox(dialog)).toHaveValue(`${IMAGE_URL}\n${VIDEO_URL}\n${SECOND_URL}`);
    expect(approval(dialog)).toBeChecked();
    fireEvent.click(within(dialog).getByTestId('social-post-draft'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(update.result).toHaveBeenCalledTimes(1);
    expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.draftSaved'), 'success');
  });

  it('shows the reviewer’s note on a draft that came back, and not on a post that is on its way', () => {
    const { unmount } = renderWithProviders(
      <ComposerDialog request={{ post: makeSocialScheduledPost({ status: 'DRAFT', review_note: 'Shorter, please' }) }} accounts={accounts} onClose={vi.fn()} />,
    );
    expect(screen.getByTestId('social-post-sent-back')).toHaveTextContent(t('marketing.social.sentBack', { vars: { note: 'Shorter, please' } }));
    unmount();

    renderWithProviders(
      <ComposerDialog request={{ post: makeSocialScheduledPost({ status: 'SCHEDULED', review_note: 'Shorter, please' }) }} accounts={accounts} onClose={vi.fn()} />,
    );
    expect(screen.queryByTestId('social-post-sent-back')).not.toBeInTheDocument();
  });

  it('keeps the composer open with the server error when saving fails, and clears it on cancel', async () => {
    const onClose = vi.fn();
    renderWithProviders(<ComposerDialog request={opened} accounts={accounts} onClose={onClose} />, {
      mocks: [{ request: { query: CREATE_SCHEDULED_SOCIAL_POST, variables: { input: draftInput() } }, ...rejection('Media URL is not reachable') }],
    });
    fireEvent.click(screen.getByTestId('social-post-draft'));
    expect(await screen.findByText('Media URL is not reachable')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(dialogsMock.notify).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: t('shell.common.cancel') }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Media URL is not reachable')).not.toBeInTheDocument();
  });
});
