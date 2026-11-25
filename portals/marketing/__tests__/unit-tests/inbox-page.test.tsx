import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { flush, renderWithProviders } from '../testkit';
import {
  conversationMock,
  dmSummaryErrorMock,
  dmSummaryMock,
  inboxCommentErrorMock,
  inboxCommentMock,
  inboxSetupErrorMock,
  inboxSetupMock,
  inboxSummaryErrorMock,
  inboxSummaryMock,
  makeConversation,
  makeInboxComment,
  makeInboxItem,
  makeThread,
  markReadMock,
  setSocialCommentStatusMock,
} from '../mocks';
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
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => ({ user: { user_id: 'u1', roles: ['MARKETING_EDITOR'] } }),
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));

import InboxPage from '../../src/pages/inbox-page';
import { inboxViewOf } from '../../src/pages/inbox-page/copy';
import { SOCIAL_CONVERSATIONS_TABLE, SOCIAL_INBOX_ITEMS_TABLE } from '../../src/pages/inbox-page/dm.queries';
import { SOCIAL_INBOX_COMMENT, SOCIAL_INBOX_TABLE } from '../../src/pages/inbox-page/queries';

const TOUR_SEEN = ['duncit.tours.completed.u1', '["marketing.inbox"]'] as const;

const renderPage = (path = '/social/inbox', mocks: MockedResponse[] = [inboxSummaryMock(), dmSummaryMock(), inboxSetupMock()]) =>
  renderWithProviders(<InboxPage />, { initialEntries: [path], mocks });

const lastFetchCall = () => tableMock.useApolloTableFetch.mock.calls.at(-1);

beforeEach(() => {
  localStorage.setItem(...TOUR_SEEN);
  __setTableRows([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('InboxPage — the All tab', () => {
  it('opens on everything with its intro, the four tabs, the cards counting comments and DMs together, and the mixed queue', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument();
    expect(screen.getByText('Every comment, Threads reply and direct message from every connected account, in one queue.')).toBeInTheDocument();
    expect(within(screen.getByTestId('page-intro')).getByText(/Open one to assign it/)).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['All', 'DMs', 'Comments', 'Threads replies']);
    expect(screen.getByRole('tab', { name: 'All', selected: true })).toBeInTheDocument();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('Nothing here. New comments and DMs arrive as they are written.');
    expect(lastFetchCall()).toEqual([expect.anything(), SOCIAL_INBOX_ITEMS_TABLE, 'socialInboxItemsTable', { extraVariables: { view: 'OPEN' } }, ['OPEN']]);
    await waitFor(() => expect(screen.getByTestId('inbox-card-OPEN')).toHaveTextContent('16'));
    expect(screen.getByTestId('inbox-card-FLAGGED')).toHaveTextContent('4');
    expect(screen.getByTestId('inbox-card-UNASSIGNED')).toHaveTextContent('7');
    expect(screen.getByTestId('inbox-card-MINE')).toHaveTextContent('3');
    expect(screen.getByTestId('inbox-card-FLAGGED').querySelector('a')).toHaveAttribute('href', '/social/inbox?channel=all&view=FLAGGED');
  });

  it('shows each row’s kind, author and status', async () => {
    __setTableRows([makeInboxItem(), makeInboxItem({ id: 'c1', kind: 'THREADS_REPLY', platform: 'THREADS', author: '', status: 'REPLIED', assigned_name: 'Asha Rao' })]);
    renderPage();
    const [dm, reply] = await screen.findAllByTestId('table-row');
    expect(within(dm).getByTestId('cell-kind')).toHaveTextContent('DM');
    expect(within(dm).getByTestId('cell-text')).toHaveTextContent('Is Sunday full?Asha K');
    expect(within(dm).getByTestId('cell-assigned_name')).toHaveTextContent('Nobody');
    expect(within(reply).getByTestId('cell-kind')).toHaveTextContent('Threads reply');
    expect(within(reply).getByTestId('cell-text')).toHaveTextContent('Unknown');
    expect(within(reply).getByTestId('cell-status')).toHaveTextContent('Replied');
    expect(within(reply).getByTestId('cell-assigned_name')).toHaveTextContent('Asha Rao');
  });

  it('opens a DM row in the conversation drawer, reading it on the way', async () => {
    __setTableRows([makeInboxItem()]);
    const thread = makeThread();
    renderPage('/social/inbox', [inboxSummaryMock(), dmSummaryMock(), inboxSetupMock(), conversationMock(thread), markReadMock(makeThread({}, { unread_count: 0 }))]);
    fireEvent.click(await screen.findByRole('button', { name: 'rowclick-0' }));
    const drawer = await screen.findByTestId('dm-drawer');
    expect(await within(drawer).findByRole('heading', { level: 2, name: 'Asha K' })).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('dm-drawer')).not.toBeInTheDocument());
  });

  it('opens a comment row by reading the comment first', async () => {
    __setTableRows([makeInboxItem({ id: 'c1', kind: 'COMMENT' })]);
    renderPage('/social/inbox', [inboxSummaryMock(), dmSummaryMock(), inboxSetupMock(), inboxCommentMock(makeInboxComment())]);
    fireEvent.click(await screen.findByRole('button', { name: 'rowclick-0' }));
    const drawer = await screen.findByTestId('inbox-drawer');
    expect(within(drawer).getByRole('heading', { level: 2, name: 'Ravi' })).toBeInTheDocument();
  });

  it('says so when a comment row cannot be read', async () => {
    __setTableRows([makeInboxItem({ id: 'gone', kind: 'COMMENT' })]);
    renderPage('/social/inbox', [inboxSummaryMock(), dmSummaryMock(), inboxSetupMock(), inboxCommentErrorMock('gone', 'Comment not found')]);
    fireEvent.click(await screen.findByRole('button', { name: 'rowclick-0' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Comment not found', 'error'));
    expect(screen.queryByTestId('inbox-drawer')).not.toBeInTheDocument();
  });

  it('does nothing for a comment row that comes back empty', async () => {
    __setTableRows([makeInboxItem({ id: 'c1', kind: 'COMMENT' })]);
    renderPage('/social/inbox', [inboxSummaryMock(), dmSummaryMock(), inboxSetupMock(), { request: { query: SOCIAL_INBOX_COMMENT, variables: { id: 'c1' } }, result: { data: { socialInboxComment: null } } }]);
    fireEvent.click(await screen.findByRole('button', { name: 'rowclick-0' }));
    await act(flush);
    await act(flush);
    expect(screen.queryByTestId('inbox-drawer')).not.toBeInTheDocument();
  });

  it('says so when the counts or the setup cannot be read', async () => {
    renderPage('/social/inbox', [inboxSummaryErrorMock('Counts down'), dmSummaryMock(), inboxSetupErrorMock('Setup down')]);
    expect(await screen.findByText('Counts down')).toBeInTheDocument();
    expect(await screen.findByText('Setup down')).toBeInTheDocument();
    expect(screen.getByTestId('inbox-card-OPEN')).toHaveTextContent('—');
  });
});

describe('InboxPage — the other tabs', () => {
  it('says when the DM counts cannot be read, and refreshes only them after an action on a conversation', async () => {
    __setTableRows([makeConversation({ unread_count: 0 })]);
    const thread = makeThread({}, { unread_count: 0 });
    renderPage('/social/inbox?channel=dms', [dmSummaryErrorMock('DM counts down'), inboxSetupMock(), conversationMock(thread)]);
    expect(await screen.findByText('DM counts down')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'rowclick-0' }));
    const drawer = await screen.findByTestId('dm-drawer');
    fireEvent.click(await within(drawer).findByTestId('inbox-done'));
    // No mock is left for the status change or the DM counts: both refusals are said, and nothing asks for comment counts.
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalled());
    expect(screen.getByTestId('inbox-card-OPEN')).toHaveTextContent('—');
  });

  it('reads the DM queue on the DMs tab, with only DM counts on the cards', async () => {
    __setTableRows([
      makeConversation(),
      makeConversation({ id: 'dm2', participant: { username: '', name: '', avatar_url: '' }, unread_count: 0, window_state: 'CLOSED' }),
      makeConversation({ id: 'dm3', participant: { username: 'only.user', name: '', avatar_url: '' }, assigned_name: 'Asha Rao' }),
    ]);
    renderPage('/social/inbox?channel=dms', [dmSummaryMock(), inboxSetupMock()]);
    const [first, second, third] = await screen.findAllByTestId('table-row');
    expect(within(third).getByTestId('cell-participant')).toHaveTextContent('only.user@only.user');
    expect(within(third).getByTestId('cell-assigned_user_id')).toHaveTextContent('Asha Rao');
    expect(within(first).getByTestId('cell-assigned_user_id')).toHaveTextContent('Nobody');
    expect(lastFetchCall()).toEqual([expect.anything(), SOCIAL_CONVERSATIONS_TABLE, 'socialConversationsTable', { extraVariables: { view: 'OPEN' } }, ['OPEN']]);
    expect(within(first).getByTestId('cell-participant')).toHaveTextContent('Asha K@asha.k');
    expect(within(first).getByTestId('cell-window_state')).toHaveTextContent('Open');
    expect(within(first).getByTestId('cell-last_message_text')).toHaveTextContent('Is Sunday full?');
    expect(within(second).getByTestId('cell-participant')).toHaveTextContent('Unknown');
    expect(within(second).getByTestId('cell-window_state')).toHaveTextContent('Closed');
    await waitFor(() => expect(screen.getByTestId('inbox-card-OPEN')).toHaveTextContent('4'));
    expect(screen.getByTestId('inbox-card-MINE').querySelector('a')).toHaveAttribute('href', '/social/inbox?channel=dms&view=MINE');
  });

  it('renders every comment column on the Comments tab, asking for every network but Threads', async () => {
    __setTableRows([
      makeInboxComment({ ai_severity: 'HIGH', ai_sentiment: 'NEGATIVE', assigned_name: 'Asha Rao', status: 'REPLIED' }),
      makeInboxComment({ id: 'c2', author_name: '', author_handle: '', post_text: null, ai_sentiment: null, platform: 'X' }),
    ]);
    renderPage('/social/inbox?channel=comments');
    const [full, sparse] = await screen.findAllByTestId('table-row');
    expect(lastFetchCall()).toEqual([expect.anything(), SOCIAL_INBOX_TABLE, 'socialInboxTable', { extraVariables: { view: 'OPEN', channel: 'COMMENTS' } }, ['OPEN', 'COMMENTS']]);
    expect(within(full).getByTestId('cell-text')).toHaveTextContent('Is this open to beginners?Sunday pickleball at HSR');
    expect(within(full).getByTestId('cell-platform')).toHaveTextContent('Instagram');
    expect(within(full).getByTestId('cell-account_id')).toHaveTextContent('Duncit Pages');
    expect(within(full).getByTestId('cell-author_name')).toHaveTextContent('Ravi');
    expect(within(full).getByTestId('cell-ai_sentiment')).toHaveTextContent('Negative');
    expect(within(full).getByTestId('cell-ai_severity')).toHaveTextContent('High');
    expect(within(full).getByTestId('cell-status')).toHaveTextContent('Replied');
    expect(within(full).getByTestId('cell-assigned_user_id')).toHaveTextContent('Asha Rao');
    expect(within(sparse).getByTestId('cell-author_name')).toHaveTextContent('Unknown');
    expect(within(sparse).getByTestId('cell-assigned_user_id')).toHaveTextContent('Nobody');
    expect(within(sparse).getByTestId('cell-ai_sentiment')).toHaveTextContent('—');
  });

  it('asks for Threads replies on their own on the Threads tab, and a pressed tab changes the queue', async () => {
    renderPage('/social/inbox?channel=threads');
    await screen.findByTestId('table-empty');
    expect(lastFetchCall()?.[3]).toEqual({ extraVariables: { view: 'OPEN', channel: 'THREADS_REPLIES' } });
    fireEvent.click(screen.getByRole('tab', { name: 'DMs' }));
    await waitFor(() => expect(lastFetchCall()?.[2]).toBe('socialConversationsTable'));
    await act(flush);
  });

  it('pins the view the URL names and toggles between everything and open, on the same tab', async () => {
    renderPage('/social/inbox?channel=comments&view=FLAGGED');
    await screen.findByTestId('table-empty');
    expect(lastFetchCall()?.[3]).toEqual({ extraVariables: { view: 'FLAGGED', channel: 'COMMENTS' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show everything' }));
    await waitFor(() => expect(lastFetchCall()?.[3]).toEqual({ extraVariables: { view: 'ALL', channel: 'COMMENTS' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Show open only' }));
    await waitFor(() => expect(lastFetchCall()?.[3]).toEqual({ extraVariables: { view: 'OPEN', channel: 'COMMENTS' } }));
    await act(flush);
  });

  it('reads an unknown view as open items', () => {
    expect(inboxViewOf(new URLSearchParams('view=NOPE'))).toBe('OPEN');
    expect(inboxViewOf(new URLSearchParams(''))).toBe('OPEN');
    expect(inboxViewOf(new URLSearchParams('view=MINE'))).toBe('MINE');
  });

  it('opens a comment in the drawer, refreshes the queue and the counts after an action, and closes', async () => {
    const comment = makeInboxComment();
    __setTableRows([comment]);
    renderPage('/social/inbox?channel=comments', [
      inboxSummaryMock(),
      inboxSetupMock(),
      setSocialCommentStatusMock('c1', 'DONE', { ...comment, status: 'DONE' }),
      inboxSummaryErrorMock('Counts down'),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'rowclick-0' }));
    const drawer = await screen.findByTestId('inbox-drawer');
    expect(within(drawer).getByRole('heading', { level: 2, name: 'Ravi' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('inbox-card-OPEN')).toHaveTextContent('12'));
    fireEvent.click(within(drawer).getByTestId('inbox-done'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Status saved.', 'success'));
    expect(await within(drawer).findByTestId('inbox-reopen')).toBeInTheDocument();
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Counts down', 'error'));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('inbox-drawer')).not.toBeInTheDocument());
  });
});
