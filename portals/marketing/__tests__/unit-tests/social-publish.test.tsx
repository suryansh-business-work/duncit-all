import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import { makeSocialAccount } from '../mocks';

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

import {
  CREATE_SCHEDULED_SOCIAL_POST,
  DELETE_SCHEDULED_SOCIAL_POST,
  RETRY_SCHEDULED_SOCIAL_POST,
  SHARE_SCHEDULED_SOCIAL_POST_NOW,
  SOCIAL_CALENDAR,
  SOCIAL_SCHEDULED_POST,
  SOCIAL_SCHEDULED_POSTS,
  UPDATE_SCHEDULED_SOCIAL_POST,
  type SocialCalendarItem,
  type SocialPublishTarget,
  type SocialQueueView,
  type SocialScheduledPost,
  type SocialScheduledPostInput,
} from '../../src/pages/social-accounts-page/publish.queries';
import { gridRange, monthWeeks } from '../../src/pages/social-accounts-page/publish/calendar-grid';
import ScheduledPostCard from '../../src/pages/social-accounts-page/publish/ScheduledPostCard';
import QueueList from '../../src/pages/social-accounts-page/publish/QueueList';
import PlannedPostDialog from '../../src/pages/social-accounts-page/publish/PlannedPostDialog';
import PublishTab from '../../src/pages/social-accounts-page/publish/PublishTab';
import ComposerDialog from '../../src/pages/social-accounts-page/publish/ComposerDialog';

const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

beforeEach(() => {
  dialogsMock.confirm.mockReset();
  dialogsMock.notify.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

const makeTarget = (over: Partial<SocialPublishTarget> = {}): SocialPublishTarget => ({
  account_id: 'sa1',
  account_name: 'Duncit Pages',
  platform: 'LINKEDIN',
  status: 'PENDING',
  permalink: null,
  error: null,
  published_at: null,
  ...over,
});

const makePost = (over: Partial<SocialScheduledPost> = {}): SocialScheduledPost => ({
  id: 'sp1',
  text: 'Run club this Sunday',
  media_url: null,
  media_type: null,
  status: 'SCHEDULED',
  scheduled_at: '2026-09-20T10:00:00.000Z',
  published_at: null,
  idea_id: null,
  targets: [makeTarget()],
  ...over,
});

const gqlPost = (post: SocialScheduledPost) => ({
  __typename: 'SocialScheduledPost',
  ...post,
  targets: post.targets.map((target) => ({ __typename: 'SocialPublishTarget', ...target })),
});

const rejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

const postsMock = (view: SocialQueueView, posts: SocialScheduledPost[]): MockedResponse => ({
  request: { query: SOCIAL_SCHEDULED_POSTS, variables: { view } },
  result: { data: { socialScheduledPosts: posts.map(gqlPost) } },
});

const postMock = (post: SocialScheduledPost): MockedResponse => ({
  request: { query: SOCIAL_SCHEDULED_POST, variables: { id: post.id } },
  result: { data: { socialScheduledPost: gqlPost(post) } },
});

const idMutation = (query: MockedResponse['request']['query'], id: string, field: string, value: unknown) => {
  const result = vi.fn(() => ({ data: { [field]: value } }));
  return { result, mock: { request: { query, variables: { id } }, result } as MockedResponse };
};

describe('ScheduledPostCard', () => {
  it('shows when a scheduled post goes out, its text, each target and the actions a scheduled post has', () => {
    const onEdit = vi.fn();
    const post = makePost();
    renderWithProviders(<ScheduledPostCard post={post} onEdit={onEdit} />);
    const card = screen.getByTestId('social-scheduled-sp1');
    expect(within(card).getByText(t('marketing.social.publishScheduled'))).toBeInTheDocument();
    expect(within(card).getByText('Goes out on 2026-09-20 10:00')).toBeInTheDocument();
    expect(within(card).getByText('Run club this Sunday')).toBeInTheDocument();
    expect(within(card).getByText('Duncit Pages · Waiting')).toBeInTheDocument();
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
    expect(card.querySelector('img')).toBeNull();
    expect(within(card).queryByRole('button', { name: t('marketing.social.retryFailed') })).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole('button', { name: t('shell.common.edit') }));
    expect(onEdit).toHaveBeenCalledWith(post);
    expect(within(card).getByRole('button', { name: t('marketing.social.shareNow') })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: t('shell.common.delete') })).toBeInTheDocument();
  });

  it('says when a sent post went out and links each network it landed on', () => {
    const post = makePost({
      status: 'PUBLISHED',
      published_at: '2026-09-14T18:30:00.000Z',
      media_url: 'https://ik.imagekit.io/duncit/run.jpg',
      media_type: 'IMAGE',
      targets: [makeTarget({ status: 'PUBLISHED', permalink: 'https://www.linkedin.com/feed/update/1' })],
    });
    renderWithProviders(<ScheduledPostCard post={post} onEdit={vi.fn()} />);
    const card = screen.getByTestId('social-scheduled-sp1');
    expect(within(card).getByText('Sent on 2026-09-14 18:30')).toBeInTheDocument();
    const link = within(card).getByRole('link');
    expect(link).toHaveAttribute('href', 'https://www.linkedin.com/feed/update/1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(link).getByText('Duncit Pages · Posted')).toBeInTheDocument();
    expect(card.querySelector('img')).toHaveAttribute('src', 'https://ik.imagekit.io/duncit/run.jpg');
    // A sent post can only be deleted — not edited, shared again or retried.
    expect(within(card).getAllByRole('button').map((button) => button.textContent)).toEqual([t('shell.common.delete')]);
  });

  it('marks a video with an icon, an undated draft as such, and empty text with a dash', () => {
    const post = makePost({
      status: 'DRAFT',
      scheduled_at: null,
      text: '',
      media_url: 'https://ik.imagekit.io/duncit/run.mp4',
      media_type: 'VIDEO',
    });
    renderWithProviders(<ScheduledPostCard post={post} onEdit={vi.fn()} />);
    const card = screen.getByTestId('social-scheduled-sp1');
    expect(within(card).getByText(t('marketing.social.noDateYet'))).toBeInTheDocument();
    expect(within(card).getByText('—')).toBeInTheDocument();
    expect(card.querySelector('img')).toBeNull();
    expect(within(card).getByTestId('VideocamOutlinedIcon')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: t('shell.common.edit') })).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: t('marketing.social.shareNow') })).not.toBeInTheDocument();
  });

  it('lists why each failed network failed and offers a retry, but not targets that failed without a reason', () => {
    const post = makePost({
      status: 'PARTIAL',
      targets: [
        makeTarget({ status: 'PUBLISHED' }),
        makeTarget({ account_id: 'sa2', account_name: 'Duncit X', platform: 'X', status: 'FAILED', error: 'Text too long' }),
        makeTarget({ account_id: 'sa3', account_name: 'Duncit FB', platform: 'FACEBOOK', status: 'FAILED', error: null }),
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
    renderWithProviders(<ScheduledPostCard post={makePost({ status: 'PUBLISHING' })} onEdit={vi.fn()} />);
    expect(within(screen.getByTestId('social-scheduled-sp1')).queryAllByRole('button')).toHaveLength(0);
  });

  it('shares a scheduled post now and says it is sending', async () => {
    const share = idMutation(SHARE_SCHEDULED_SOCIAL_POST_NOW, 'sp1', 'shareScheduledSocialPostNow', gqlPost(makePost({ status: 'PUBLISHING' })));
    renderWithProviders(<ScheduledPostCard post={makePost()} onEdit={vi.fn()} />, { mocks: [share.mock] });
    fireEvent.click(screen.getByRole('button', { name: t('marketing.social.shareNow') }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.publishingNow'), 'success'));
    expect(share.result).toHaveBeenCalledTimes(1);
  });

  it('retries a failed post and reports the server refusing it', async () => {
    renderWithProviders(<ScheduledPostCard post={makePost({ status: 'FAILED' })} onEdit={vi.fn()} />, {
      mocks: [{ request: { query: RETRY_SCHEDULED_SOCIAL_POST, variables: { id: 'sp1' } }, ...rejection('Account needs reconnecting') }],
    });
    fireEvent.click(screen.getByRole('button', { name: t('marketing.social.retryFailed') }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Account needs reconnecting', 'error'));
    expect(dialogsMock.notify).not.toHaveBeenCalledWith(expect.anything(), 'success');
  });

  it('retries a failed post and says it is retrying', async () => {
    const retry = idMutation(RETRY_SCHEDULED_SOCIAL_POST, 'sp1', 'retryScheduledSocialPost', gqlPost(makePost({ status: 'PUBLISHING' })));
    renderWithProviders(<ScheduledPostCard post={makePost({ status: 'FAILED' })} onEdit={vi.fn()} />, { mocks: [retry.mock] });
    fireEvent.click(screen.getByRole('button', { name: t('marketing.social.retryFailed') }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.retrying'), 'success'));
    expect(retry.result).toHaveBeenCalledTimes(1);
  });

  it('asks before deleting and does nothing when the marketer backs out', async () => {
    dialogsMock.confirm.mockResolvedValue(false);
    const remove = idMutation(DELETE_SCHEDULED_SOCIAL_POST, 'sp1', 'deleteScheduledSocialPost', true);
    const onRemoved = vi.fn();
    renderWithProviders(<ScheduledPostCard post={makePost()} onEdit={vi.fn()} onRemoved={onRemoved} />, { mocks: [remove.mock] });
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
    renderWithProviders(<ScheduledPostCard post={makePost()} onEdit={vi.fn()} onRemoved={onRemoved} />, { mocks: [remove.mock] });
    fireEvent.click(screen.getByRole('button', { name: t('shell.common.delete') }));
    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1));
    expect(remove.result).toHaveBeenCalledTimes(1);
    expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.postDeleted'), 'success');
  });

  it('keeps the card when the delete fails, and reports why', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    const onRemoved = vi.fn();
    renderWithProviders(<ScheduledPostCard post={makePost()} onEdit={vi.fn()} onRemoved={onRemoved} />, {
      mocks: [{ request: { query: DELETE_SCHEDULED_SOCIAL_POST, variables: { id: 'sp1' } }, ...rejection('Already sent') }],
    });
    fireEvent.click(screen.getByRole('button', { name: t('shell.common.delete') }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Already sent', 'error'));
    expect(onRemoved).not.toHaveBeenCalled();
  });

  it('deletes from a list card that has no dialog to close', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    const remove = idMutation(DELETE_SCHEDULED_SOCIAL_POST, 'sp1', 'deleteScheduledSocialPost', true);
    renderWithProviders(<ScheduledPostCard post={makePost()} onEdit={vi.fn()} />, { mocks: [remove.mock] });
    fireEvent.click(screen.getByRole('button', { name: t('shell.common.delete') }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.postDeleted'), 'success'));
    expect(remove.result).toHaveBeenCalledTimes(1);
  });
});

describe('QueueList', () => {
  it('shows a progress bar while the list loads, then a card per post', async () => {
    const onEdit = vi.fn();
    const first = makePost();
    const second = makePost({ id: 'sp2', text: 'Monsoon pods' });
    renderWithProviders(<QueueList view="QUEUE" onEdit={onEdit} />, { mocks: [postsMock('QUEUE', [first, second])] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    const list = await screen.findByTestId('social-queue-queue');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(list).getByTestId('social-scheduled-sp1')).toBeInTheDocument();
    expect(within(list).getByTestId('social-scheduled-sp2')).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId('social-scheduled-sp2')).getByRole('button', { name: t('shell.common.edit') }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'sp2', text: 'Monsoon pods' }));
  });

  it.each([
    ['QUEUE', 'marketing.social.emptyQueue'],
    ['DRAFTS', 'marketing.social.emptyDrafts'],
    ['SENT', 'marketing.social.emptySent'],
  ] as const)('tells the marketer when the %s list is empty', async (view, key) => {
    renderWithProviders(<QueueList view={view} onEdit={vi.fn()} />, { mocks: [postsMock(view, [])] });
    expect(await screen.findByText(t(key))).toBeInTheDocument();
    expect(screen.queryByTestId(`social-queue-${view.toLowerCase()}`)).not.toBeInTheDocument();
  });

  it('shows the server error when the list cannot load', async () => {
    renderWithProviders(<QueueList view="SENT" onEdit={vi.fn()} />, {
      mocks: [{ request: { query: SOCIAL_SCHEDULED_POSTS, variables: { view: 'SENT' } }, ...rejection('Publishing is down') }],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Publishing is down');
  });

  it('follows a post that is going out until it lands, then stops asking', async () => {
    vi.useFakeTimers();
    const sending = vi.fn(() => ({ data: { socialScheduledPosts: [gqlPost(makePost({ status: 'PUBLISHING' }))] } }));
    const landed = vi.fn(() => ({ data: { socialScheduledPosts: [gqlPost(makePost({ status: 'PUBLISHED', published_at: '2026-09-15T08:00:05.000Z' }))] } }));
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
    const post = makePost();
    const onEdit = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<PlannedPostDialog postId="sp1" onEdit={onEdit} onClose={onClose} />, { mocks: [postMock(post)] });
    const dialog = screen.getByRole('dialog', { name: t('marketing.social.plannedPost') });
    expect(within(dialog).getByRole('progressbar')).toBeInTheDocument();
    const card = await within(dialog).findByTestId('social-scheduled-sp1');
    expect(within(dialog).queryByRole('progressbar')).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: t('shell.common.edit') }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'sp1', text: 'Run club this Sunday' }));
  });

  it('closes after the post is deleted, and from its Close button', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    const remove = idMutation(DELETE_SCHEDULED_SOCIAL_POST, 'sp1', 'deleteScheduledSocialPost', true);
    const onClose = vi.fn();
    renderWithProviders(<PlannedPostDialog postId="sp1" onEdit={vi.fn()} onClose={onClose} />, { mocks: [postMock(makePost()), remove.mock] });
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
  const calendarItem = (over: Partial<SocialCalendarItem>): SocialCalendarItem => ({
    id: 'c1',
    kind: 'PLANNED',
    at: '2026-09-17T10:00:00.000Z',
    status: 'SCHEDULED',
    text: 'Run club recap',
    media_url: null,
    permalink: null,
    platforms: ['LINKEDIN'],
    account_names: ['Duncit Pages'],
    engagement: null,
    ...over,
  });

  const calendarMock = (items: SocialCalendarItem[]): MockedResponse => ({
    request: { query: SOCIAL_CALENDAR, variables: gridRange(monthWeeks('2026-09')) },
    result: { data: { socialCalendar: items.map((item) => ({ __typename: 'SocialCalendarItem', ...item })) } },
  });

  it('opens on the calendar and starts a blank post or one dated on a picked day', async () => {
    const onCompose = vi.fn();
    renderWithProviders(<PublishTab onCompose={onCompose} onOpenPost={vi.fn()} />, { mocks: [calendarMock([])] });
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
        calendarMock([calendarItem({}), calendarItem({ id: 'np1', kind: 'PUBLISHED', status: 'PUBLISHED', at: '2026-09-10T09:00:00.000Z' })]),
        postMock(makePost({ id: 'c1' })),
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

  it('switches to a list, keeps it when the pressed view is pressed again, and edits from it', async () => {
    const onCompose = vi.fn();
    renderWithProviders(<PublishTab onCompose={onCompose} onOpenPost={vi.fn()} />, {
      mocks: [calendarMock([]), postsMock('DRAFTS', [makePost({ id: 'd1', status: 'DRAFT' })])],
    });
    const group = screen.getByRole('group', { name: t('marketing.social.publishView') });
    expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual([
      t('marketing.social.viewCalendar'),
      t('marketing.social.viewQueue'),
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
});

describe('ComposerDialog', () => {
  const accounts = [makeSocialAccount()];
  const createMock = (input: SocialScheduledPostInput) => {
    const result = vi.fn(() => ({ data: { createScheduledSocialPost: gqlPost(makePost({ id: 'new1', status: 'DRAFT' })) } }));
    return { result, mock: { request: { query: CREATE_SCHEDULED_SOCIAL_POST, variables: { input } }, result } as MockedResponse };
  };
  // A new post opened with every field it carries; a request missing media_url or
  // scheduled_at currently fails validation (reported as a source bug).
  const opened = { text: 'Fresh idea', media_url: 'https://ik.imagekit.io/duncit/run.jpg', scheduled_at: '2026-09-20T10:00:00.000Z' };
  const draftInput = (over: Partial<SocialScheduledPostInput> = {}): SocialScheduledPostInput => ({
    text: 'Fresh idea',
    media_url: 'https://ik.imagekit.io/duncit/run.jpg',
    media_type: 'IMAGE',
    account_ids: [],
    mode: 'DRAFT',
    scheduled_at: '2026-09-20T10:00:00.000Z',
    idea_id: null,
    ...over,
  });

  it('renders nothing while there is no request', () => {
    renderWithProviders(<ComposerDialog request={null} accounts={accounts} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts a new post from what it was opened with and saves it as a draft linked to the idea', async () => {
    const onClose = vi.fn();
    const create = createMock(draftInput({ idea_id: 'i7' }));
    renderWithProviders(
      <ComposerDialog request={{ ...opened, idea_id: 'i7' }} accounts={accounts} onClose={onClose} />,
      { mocks: [create.mock] },
    );
    const dialog = screen.getByRole('dialog', { name: t('marketing.social.createPost') });
    expect(within(dialog).getByRole('textbox', { name: t('marketing.social.postText') })).toHaveValue('Fresh idea');
    fireEvent.click(within(dialog).getByTestId('social-post-draft'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(create.result).toHaveBeenCalledTimes(1);
    expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.draftSaved'), 'success');
  });

  it('edits an existing post with its own accounts, sends it now and keeps its idea', async () => {
    const onClose = vi.fn();
    const post = makePost({ idea_id: 'i3', text: 'Edited copy', scheduled_at: null });
    const input: SocialScheduledPostInput = {
      text: 'Edited copy',
      media_url: null,
      media_type: null,
      account_ids: ['sa1'],
      mode: 'NOW',
      scheduled_at: null,
      idea_id: 'i3',
    };
    const update = vi.fn(() => ({ data: { updateScheduledSocialPost: gqlPost({ ...post, status: 'PUBLISHING' }) } }));
    renderWithProviders(<ComposerDialog request={{ post, idea_id: 'ignored' }} accounts={accounts} onClose={onClose} />, {
      mocks: [{ request: { query: UPDATE_SCHEDULED_SOCIAL_POST, variables: { id: 'sp1', input } }, result: update }],
    });
    const dialog = screen.getByRole('dialog', { name: t('marketing.social.editPost') });
    expect(within(dialog).getByRole('checkbox', { name: 'Duncit Pages' })).toBeChecked();
    fireEvent.click(within(dialog).getByTestId('social-post-now'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledTimes(1);
    expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.publishingNow'), 'success');
  });

  it('schedules an edited post at its own time, falling back to the opened idea', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T08:00:00.000Z'));
    const onClose = vi.fn();
    const post = makePost({ media_url: 'https://ik.imagekit.io/duncit/run.jpg', media_type: 'IMAGE' });
    const input: SocialScheduledPostInput = {
      text: 'Run club this Sunday',
      media_url: 'https://ik.imagekit.io/duncit/run.jpg',
      media_type: 'IMAGE',
      account_ids: ['sa1'],
      mode: 'SCHEDULE',
      scheduled_at: '2026-09-20T10:00:00.000Z',
      idea_id: 'i5',
    };
    const update = vi.fn(() => ({ data: { updateScheduledSocialPost: gqlPost(post) } }));
    renderWithProviders(<ComposerDialog request={{ post, idea_id: 'i5' }} accounts={accounts} onClose={onClose} />, {
      mocks: [{ request: { query: UPDATE_SCHEDULED_SOCIAL_POST, variables: { id: 'sp1', input } }, result: update }],
    });
    fireEvent.click(screen.getByTestId('social-post-schedule'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledTimes(1);
    expect(dialogsMock.notify).toHaveBeenCalledWith(t('marketing.social.postScheduled'), 'success');
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
