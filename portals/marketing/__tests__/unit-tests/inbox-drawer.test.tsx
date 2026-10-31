import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  assignSocialCommentMock,
  audienceListOwnersMock,
  makeInboxComment,
  makeInboxReply,
  makeReplyCapabilities,
  replyToSocialCommentErrorMock,
  replyToSocialCommentMock,
  setSocialCommentStatusErrorMock,
  setSocialCommentStatusMock,
  suggestSocialReplyErrorMock,
  suggestSocialReplyMock,
} from '../mocks';
import { SET_SOCIAL_COMMENT_STATUS, type InboxComment, type SocialReplyCapability } from '../../src/pages/inbox-page/queries';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));
const userCtx = vi.hoisted(() => ({ value: null as { user: { user_id: string; roles: string[] } | null } | null }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userCtx.value,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));

import InboxDrawer from '../../src/pages/inbox-page/drawer/InboxDrawer';

const renderDrawer = (
  comment: InboxComment | null,
  mocks: MockedResponse[] = [],
  capabilities: SocialReplyCapability[] = makeReplyCapabilities(),
) => {
  const onChanged = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(<InboxDrawer comment={comment} capabilities={capabilities} onClose={onClose} onChanged={onChanged} />, { mocks });
  return { onChanged, onClose };
};

const box = () => screen.getByRole('textbox', { name: 'Reply' });

beforeEach(() => {
  userCtx.value = { user: { user_id: 'u1', roles: ['MARKETING_EDITOR'] } };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('InboxDrawer — the comment', () => {
  it('shows nothing while closed', () => {
    renderDrawer(null);
    expect(screen.queryByTestId('inbox-drawer')).not.toBeInTheDocument();
  });

  it('shows what was said, where, the AI’s read and the links to it', () => {
    renderDrawer(makeInboxComment({ ai_reason: 'Asks for a phone number', ai_categories: ['SPAM'], ai_severity: 'MEDIUM' }));
    const details = screen.getByTestId('inbox-comment');
    expect(screen.getByRole('heading', { level: 2, name: 'Ravi' })).toBeInTheDocument();
    expect(within(details).getByText('Instagram · Duncit Pages')).toBeInTheDocument();
    expect(within(details).getByText('Is this open to beginners?')).toBeInTheDocument();
    expect(within(details).getByText('Why the AI flagged it')).toBeInTheDocument();
    expect(within(details).getByText('Asks for a phone number')).toBeInTheDocument();
    expect(within(details).getByText('On the post: Sunday pickleball at HSR')).toBeInTheDocument();
    expect(within(details).getByText('Medium')).toBeInTheDocument();
    expect(within(details).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      'https://instagram.com/p/1/c/1',
      'https://instagram.com/p/1',
    ]);
    expect(screen.getByText('No replies yet.')).toBeInTheDocument();
  });

  it('falls back to the handle, then to Comment, and leaves out what is missing', () => {
    renderDrawer(makeInboxComment({ author_name: '', post_text: null }));
    expect(screen.getByRole('heading', { level: 2, name: 'ravi_k' })).toBeInTheDocument();
    expect(screen.queryByText(/On the post/)).not.toBeInTheDocument();
    expect(screen.queryByText('Why the AI flagged it')).not.toBeInTheDocument();
  });

  it('names a comment with no author as Comment', () => {
    renderDrawer(makeInboxComment({ author_name: null, author_handle: null }));
    expect(screen.getByRole('heading', { level: 2, name: 'Comment' })).toBeInTheDocument();
  });

  it('lists the replies, with a refused one saying why', () => {
    renderDrawer(
      makeInboxComment({
        replies: [makeInboxReply(), makeInboxReply({ at: null, text: 'Second', ok: false, error: 'token revoked', by_name: '' })],
      }),
    );
    const replies = screen.getByTestId('inbox-replies');
    expect(within(replies).getByText('Yes, beginners are welcome!')).toBeInTheDocument();
    expect(within(replies).getByText('Asha Rao · fmt:2026-10-31T10:00:00.000Z')).toBeInTheDocument();
    expect(within(replies).getByText('Not sent: token revoked')).toBeInTheDocument();
  });
});

describe('InboxDrawer — assign and status', () => {
  it('assigns the comment to the person, and has no such button once it is theirs', async () => {
    const comment = makeInboxComment();
    const mine = { ...comment, assigned_user_id: 'u1', assigned_name: 'Asha Rao' };
    const { onChanged } = renderDrawer(comment, [assignSocialCommentMock('c1', 'u1', mine)]);
    expect(screen.getByTestId('inbox-assignee')).toHaveTextContent('Nobody');
    expect(screen.queryByTestId('inbox-assign-pick')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('inbox-assign-me'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Assignee saved.', 'success'));
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ assigned_user_id: 'u1' }));
  });

  it('has no Assign to me for a comment already theirs, or for nobody signed in', () => {
    renderDrawer(makeInboxComment({ assigned_user_id: 'u1', assigned_name: 'Asha Rao' }));
    expect(screen.getByTestId('inbox-assignee')).toHaveTextContent('Asha Rao');
    expect(screen.queryByTestId('inbox-assign-me')).not.toBeInTheDocument();
  });

  it('has no Assign to me when nobody is signed in', () => {
    userCtx.value = { user: null };
    renderDrawer(makeInboxComment());
    expect(screen.queryByTestId('inbox-assign-me')).not.toBeInTheDocument();
  });

  it('lets a manager pick the assignee from the portal’s people', async () => {
    userCtx.value = { user: { user_id: 'u1', roles: ['MARKETING_MANAGER'] } };
    const comment = makeInboxComment();
    renderDrawer(comment, [audienceListOwnersMock, assignSocialCommentMock('c1', 'boss', { ...comment, assigned_user_id: 'boss', assigned_name: 'Ravi Boss' })]);
    fireEvent.click(screen.getByTestId('inbox-assign-pick'));
    const dialog = await screen.findByRole('dialog', { name: 'Who works this comment?' });
    const input = within(dialog).getByRole('combobox', { name: 'Owner' });
    fireEvent.mouseDown(input);
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Ravi Boss' }));
    fireEvent.click(within(dialog).getByTestId('lead-owner-save'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Assignee saved.', 'success'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Who works this comment?' })).not.toBeInTheDocument());
  });

  it('says when closing a comment as spam fails, and changes nothing', async () => {
    const comment = makeInboxComment();
    const { onChanged } = renderDrawer(comment, [setSocialCommentStatusErrorMock('c1', 'SPAM', 'No such comment')]);
    fireEvent.click(screen.getByTestId('inbox-spam'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('No such comment', 'error'));
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.queryByTestId('inbox-reopen')).not.toBeInTheDocument();
  });

  it('reopens a closed comment', async () => {
    const comment = makeInboxComment({ status: 'DONE' });
    const { onChanged } = renderDrawer(comment, [setSocialCommentStatusMock('c1', 'OPEN', { ...comment, status: 'OPEN' })]);
    expect(screen.queryByTestId('inbox-done')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('inbox-reopen'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: 'OPEN' })));
  });

  it('changes nothing when the server hands no comment back', async () => {
    const empty: MockedResponse = {
      request: { query: SET_SOCIAL_COMMENT_STATUS, variables: { id: 'c1', status: 'DONE' } },
      result: { data: { setSocialCommentStatus: null } },
    };
    const { onChanged } = renderDrawer(makeInboxComment(), [empty]);
    fireEvent.click(screen.getByTestId('inbox-done'));
    await waitFor(() => expect(screen.getByTestId('inbox-done')).not.toBeDisabled());
    expect(onChanged).not.toHaveBeenCalled();
    expect(dialogsMock.notify).not.toHaveBeenCalledWith('Status saved.', 'success');
  });
});

describe('InboxDrawer — answering', () => {
  it('fills the box with Claude’s draft, sends the edited reply and clears the box', async () => {
    const comment = makeInboxComment();
    const replied = { ...comment, status: 'REPLIED' as const, replies: [makeInboxReply({ text: 'Yes! See you Sunday.' })] };
    const { onChanged } = renderDrawer(comment, [suggestSocialReplyMock('c1', 'Yes!'), replyToSocialCommentMock('c1', 'Yes! See you Sunday.', replied)]);
    expect(screen.getByText('At most 2200 characters on this network.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('inbox-suggest'));
    await waitFor(() => expect(box()).toHaveValue('Yes!'));
    expect(dialogsMock.notify).toHaveBeenCalledWith('Draft ready. Edit it, then press Send.', 'success');
    fireEvent.change(box(), { target: { value: 'Yes! See you Sunday.' } });
    fireEvent.click(screen.getByTestId('inbox-send'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Reply sent.', 'success'));
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: 'REPLIED' }));
    await waitFor(() => expect(box()).toHaveValue(''));
  });

  it('keeps the box as it was when the draft or the send fails', async () => {
    renderDrawer(makeInboxComment(), [suggestSocialReplyErrorMock('c1', 'AI is switched off'), replyToSocialCommentErrorMock('c1', 'Hello', 'Not sent')]);
    fireEvent.click(screen.getByTestId('inbox-suggest'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('AI is switched off', 'error'));
    fireEvent.change(box(), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByTestId('inbox-send'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Not sent', 'error'));
    expect(box()).toHaveValue('Hello');
  });

  it('leaves the box alone when the draft comes back empty', async () => {
    renderDrawer(makeInboxComment(), [suggestSocialReplyMock('c1', '')]);
    fireEvent.click(screen.getByTestId('inbox-suggest'));
    await waitFor(() => expect(screen.getByTestId('inbox-suggest')).not.toBeDisabled());
    expect(box()).toHaveValue('');
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('disables Send on a network this integration cannot answer, naming the permission', () => {
    renderDrawer(makeInboxComment({ platform: 'FACEBOOK' }));
    expect(screen.getByTestId('inbox-send')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'More about this' })).toBeInTheDocument();
    expect(screen.getByText('At most 8000 characters on this network.')).toBeInTheDocument();
  });

  it('falls back to a short limit for a network it has no word on, and to a blank permission', () => {
    renderDrawer(makeInboxComment({ platform: 'YOUTUBE' }), [], [{ platform: 'YOUTUBE', can_reply: false, missing_permission: null, max_length: 500 }]);
    expect(screen.getByTestId('inbox-send')).toBeDisabled();
  });

  it('uses the fallback limit while the capabilities are not known', () => {
    renderDrawer(makeInboxComment({ platform: 'THREADS' }), [], []);
    expect(screen.getByText('At most 280 characters on this network.')).toBeInTheDocument();
    expect(screen.getByTestId('inbox-send')).not.toBeDisabled();
  });
});
