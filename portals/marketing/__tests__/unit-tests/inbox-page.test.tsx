import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { flush, renderWithProviders } from '../testkit';
import {
  inboxSetupErrorMock,
  inboxSetupMock,
  inboxSummaryErrorMock,
  inboxSummaryMock,
  makeInboxComment,
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
import { SOCIAL_INBOX_TABLE } from '../../src/pages/inbox-page/queries';

const TOUR_SEEN = ['duncit.tours.completed.u1', '["marketing.inbox"]'] as const;

const renderPage = (path = '/social/inbox', mocks: MockedResponse[] = [inboxSummaryMock(), inboxSetupMock()]) =>
  renderWithProviders(<InboxPage />, { initialEntries: [path], mocks });

const lastFetchCall = () => tableMock.useApolloTableFetch.mock.calls.at(-1);

beforeEach(() => {
  localStorage.setItem(...TOUR_SEEN);
  __setTableRows([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('InboxPage', () => {
  it('opens on the open comments with its intro, the four cards and the queue', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument();
    expect(screen.getByText('Every comment from every connected account, in one queue.')).toBeInTheDocument();
    expect(within(screen.getByTestId('page-intro')).getByText(/Open a comment to assign it/)).toBeInTheDocument();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('Nothing here. New comments arrive with each sync.');
    expect(lastFetchCall()).toEqual([expect.anything(), SOCIAL_INBOX_TABLE, 'socialInboxTable', { extraVariables: { view: 'OPEN' } }, ['OPEN']]);
    await waitFor(() => expect(screen.getByTestId('inbox-card-OPEN')).toHaveTextContent('12'));
    expect(screen.getByTestId('inbox-card-FLAGGED')).toHaveTextContent('3');
    expect(screen.getByTestId('inbox-card-UNASSIGNED')).toHaveTextContent('5');
    expect(screen.getByTestId('inbox-card-MINE')).toHaveTextContent('2');
    expect(screen.getByTestId('inbox-card-FLAGGED').querySelector('a')).toHaveAttribute('href', '/social/inbox?view=FLAGGED');
  });

  it('renders every column for a full row and a sparse one', async () => {
    __setTableRows([
      makeInboxComment({ ai_severity: 'HIGH', ai_sentiment: 'NEGATIVE', assigned_name: 'Asha Rao', status: 'REPLIED' }),
      makeInboxComment({ id: 'c2', author_name: '', author_handle: '', post_text: null, ai_sentiment: null, platform: 'X' }),
    ]);
    renderPage();
    const rows = await screen.findAllByTestId('table-row');
    expect(rows).toHaveLength(2);
    const [full, sparse] = rows;
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

  it('pins the view the URL names and toggles between everything and open', async () => {
    renderPage('/social/inbox?view=FLAGGED');
    await screen.findByTestId('table-empty');
    expect(lastFetchCall()?.[3]).toEqual({ extraVariables: { view: 'FLAGGED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show every comment' }));
    await waitFor(() => expect(lastFetchCall()?.[3]).toEqual({ extraVariables: { view: 'ALL' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Show open only' }));
    await waitFor(() => expect(lastFetchCall()?.[3]).toEqual({ extraVariables: { view: 'OPEN' } }));
    await act(flush);
  });

  it('reads an unknown view as open comments', () => {
    expect(inboxViewOf(new URLSearchParams('view=NOPE'))).toBe('OPEN');
    expect(inboxViewOf(new URLSearchParams(''))).toBe('OPEN');
    expect(inboxViewOf(new URLSearchParams('view=MINE'))).toBe('MINE');
  });

  it('says so when the counts or the setup cannot be read', async () => {
    renderPage('/social/inbox', [inboxSummaryErrorMock('Counts down'), inboxSetupErrorMock('Setup down')]);
    expect(await screen.findByText('Counts down')).toBeInTheDocument();
    expect(await screen.findByText('Setup down')).toBeInTheDocument();
    expect(screen.getByTestId('inbox-card-OPEN')).toHaveTextContent('—');
  });

  it('opens a row in the drawer, refreshes the queue and the counts after an action, and closes', async () => {
    const comment = makeInboxComment();
    __setTableRows([comment]);
    renderPage('/social/inbox', [
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
