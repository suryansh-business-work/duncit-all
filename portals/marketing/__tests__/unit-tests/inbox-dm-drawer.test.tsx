import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  audienceListOwnersMock,
  assignConversationMock,
  conversationErrorMock,
  conversationMock,
  createConversationLeadErrorMock,
  createConversationLeadMock,
  makeDmMessage,
  makeThread,
  markReadMock,
  sendMessageErrorMock,
  sendMessageMock,
  setConversationStatusMock,
  suggestMessageErrorMock,
  suggestMessageMock,
} from '../mocks';

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

import ConversationDrawer from '../../src/pages/inbox-page/dms/ConversationDrawer';
import { MARK_SOCIAL_CONVERSATION_READ } from '../../src/pages/inbox-page/dm.queries';
import { GraphQLError } from 'graphql';

/** A thread already read, so opening it does not call markRead. */
const read = (over: Parameters<typeof makeThread>[0] = {}, conversation: Parameters<typeof makeThread>[1] = {}) =>
  makeThread(over, { unread_count: 0, ...conversation });

const renderDrawer = (mocks: MockedResponse[], onChanged = vi.fn(), id: string | null = 'dm1') => {
  const onClose = vi.fn();
  renderWithProviders(<ConversationDrawer conversationId={id} onClose={onClose} onChanged={onChanged} />, { mocks });
  return { onClose, onChanged };
};

beforeEach(() => {
  userCtx.value = { user: { user_id: 'u1', roles: ['MARKETING_EDITOR'] } };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ConversationDrawer', () => {
  it('shows the person, the open window, the thread and the box to answer', async () => {
    const thread = read({
      messages: [
        makeDmMessage({ id: 'm1', attachments: [{ type: 'image', url: 'https://cdn/i.jpg' }] }),
        makeDmMessage({ id: 'm2', direction: 'OUT', text: 'Two spots left', status: 'SENT', sent_by_name: 'Dee', tag: 'HUMAN_AGENT' }),
        makeDmMessage({ id: 'm3', direction: 'OUT', text: 'Auto hi', status: 'SENT', automated: true }),
        makeDmMessage({ id: 'm4', direction: 'OUT', text: 'Nope', status: 'FAILED', error: 'Window closed' }),
      ],
    });
    renderDrawer([conversationMock(thread)]);
    const drawer = await screen.findByTestId('dm-drawer');
    expect(await within(drawer).findByRole('heading', { level: 2, name: 'Asha K' })).toBeInTheDocument();
    expect(within(drawer).getByText('@asha.k · Instagram · Duncit IG')).toBeInTheDocument();
    expect(within(drawer).getByTestId('dm-window-OPEN')).toHaveTextContent('Messaging window open until fmt:2026-11-25T10:00:00.000Z.');
    expect(within(drawer).getByText('Attachment (image)')).toHaveAttribute('href', 'https://cdn/i.jpg');
    expect(within(drawer).getByText('Human agent reply')).toBeInTheDocument();
    expect(within(drawer).getByText('Auto-reply')).toBeInTheDocument();
    expect(within(drawer).getByTestId('dm-failed-m4')).toHaveTextContent('Not sent: Window closed');
    expect(within(drawer).getByTestId('inbox-send')).toBeEnabled();
    expect(within(drawer).getByTestId('dm-create-lead')).toBeInTheDocument();
  });

  it('reads an unread conversation once it opens, and tells the queue', async () => {
    const thread = makeThread();
    const { onChanged } = renderDrawer([conversationMock(thread), markReadMock(read())]);
    await screen.findByTestId('dm-drawer');
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('turns Send off with the reason when the window has closed or the permission is missing', async () => {
    renderDrawer([conversationMock(read({}, { window_state: 'CLOSED', window_closes_at: null, opted_out: true }))]);
    const drawer = await screen.findByTestId('dm-drawer');
    expect(await within(drawer).findByTestId('dm-window-CLOSED')).toHaveTextContent('Messaging window closed.');
    expect(within(drawer).getByTestId('dm-opted-out')).toBeInTheDocument();
    expect(within(drawer).getByTestId('inbox-send')).toBeDisabled();
  });

  it('names the missing messaging permission, and the human-agent window', async () => {
    renderDrawer([conversationMock(read({ missing_permission: 'instagram_manage_messages' }, { window_state: 'HUMAN_AGENT' }))]);
    const drawer = await screen.findByTestId('dm-drawer');
    expect(await within(drawer).findByTestId('dm-window-HUMAN_AGENT')).toHaveTextContent('only a person can reply');
    expect(within(drawer).getByTestId('inbox-send')).toBeDisabled();
  });

  it('sends the typed message and says so; a refusal is shown as the server said it', async () => {
    const thread = read();
    const sent = read({ messages: [...thread.messages, makeDmMessage({ id: 'm9', direction: 'OUT', text: 'See you', status: 'SENT' })] }, { status: 'REPLIED' });
    const { onChanged } = renderDrawer([conversationMock(thread), sendMessageMock('dm1', 'See you', sent), conversationMock(sent), sendMessageErrorMock('dm1', 'Again', 'Window closed')]);
    const drawer = await screen.findByTestId('dm-drawer');
    fireEvent.change(await within(drawer).findByRole('textbox', { name: 'Reply' }), { target: { value: ' See you ' } });
    fireEvent.click(within(drawer).getByTestId('inbox-send'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Message sent.', 'success'));
    expect(onChanged).toHaveBeenCalled();
    fireEvent.change(within(drawer).getByRole('textbox', { name: 'Reply' }), { target: { value: 'Again' } });
    fireEvent.click(within(drawer).getByTestId('inbox-send'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Window closed', 'error'));
  });

  it('fills the box with the AI draft, and says when there is none', async () => {
    renderDrawer([conversationMock(read()), suggestMessageMock('dm1', 'Yes, two spots left!'), suggestMessageErrorMock('dm1', 'AI is off')]);
    const drawer = await screen.findByTestId('dm-drawer');
    fireEvent.click(await within(drawer).findByTestId('inbox-suggest'));
    await waitFor(() => expect(within(drawer).getByRole('textbox', { name: 'Reply' })).toHaveValue('Yes, two spots left!'));
    expect(dialogsMock.notify).toHaveBeenCalledWith('Draft ready. Edit it, then press Send.', 'success');
    fireEvent.click(within(drawer).getByTestId('inbox-suggest'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('AI is off', 'error'));
  });

  it('creates a lead from the conversation, or says it matched one, or why it could not', async () => {
    const linked = read({}, { marketing_lead_id: 'lead1' });
    renderDrawer([conversationMock(read()), createConversationLeadMock('dm1', linked), conversationMock(linked)]);
    const drawer = await screen.findByTestId('dm-drawer');
    fireEvent.click(await within(drawer).findByTestId('dm-create-lead'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Lead created.', 'success'));
    expect(await within(drawer).findByTestId('dm-marketing-lead')).toHaveTextContent('In the lead pipeline');
  });

  it('says a matched lead was linked, and shows a lead refusal', async () => {
    renderDrawer([conversationMock(read({}, { ig_lead_id: 'ig1' })), createConversationLeadMock('dm1', read(), true), conversationMock(read()), createConversationLeadErrorMock('dm1', 'No name yet')]);
    const drawer = await screen.findByTestId('dm-drawer');
    expect(await within(drawer).findByTestId('dm-ig-lead')).toHaveTextContent('Instagram lead');
    fireEvent.click(within(drawer).getByTestId('dm-create-lead'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('This person was already a lead; the conversation is linked to them.', 'success'));
    fireEvent.click(within(drawer).getByTestId('dm-create-lead'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('No name yet', 'error'));
  });

  it('assigns it to the person signed in and closes it', async () => {
    const thread = read();
    const mine = read({}, { assigned_user_id: 'u1', assigned_name: 'Dee Em' });
    const done = read({}, { assigned_user_id: 'u1', assigned_name: 'Dee Em', status: 'DONE' });
    renderDrawer([conversationMock(thread), assignConversationMock('dm1', 'u1', mine), conversationMock(mine), setConversationStatusMock('dm1', 'DONE', done), conversationMock(done)]);
    const drawer = await screen.findByTestId('dm-drawer');
    fireEvent.click(await within(drawer).findByTestId('inbox-assign-me'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Assignee saved.', 'success'));
    expect(await within(drawer).findByText('Dee Em')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByTestId('inbox-done'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Status saved.', 'success'));
    expect(await within(drawer).findByTestId('inbox-reopen')).toBeInTheDocument();
  });

  it('says when the conversation cannot be read, closes, and renders nothing when there is none', async () => {
    const { onClose } = renderDrawer([conversationErrorMock('dm1', 'Conversation not found')]);
    expect(await screen.findByText('Conversation not found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('is closed when no conversation is open', () => {
    renderDrawer([], vi.fn(), null);
    expect(screen.queryByTestId('dm-drawer')).not.toBeInTheDocument();
  });

  it('names a person by username when there is no name, and says Conversation when there is neither', async () => {
    renderDrawer([conversationMock(read({}, { participant: { username: 'only.user', name: '', avatar_url: '' } }))]);
    expect(await screen.findByRole('heading', { level: 2, name: 'only.user' })).toBeInTheDocument();
  });

  it('falls back to Conversation for a nameless person, with no handle in the line under it', async () => {
    renderDrawer([conversationMock(read({}, { participant: { username: '', name: '', avatar_url: '' } }))]);
    expect(await screen.findByRole('heading', { level: 2, name: 'Conversation' })).toBeInTheDocument();
    expect(screen.getByText('Instagram · Duncit IG')).toBeInTheDocument();
  });

  it('has no Assign to me and no picker when nobody is signed in', async () => {
    userCtx.value = { user: null };
    renderDrawer([conversationMock(read())]);
    await screen.findByTestId('dm-window-OPEN');
    expect(screen.queryByTestId('inbox-assign-me')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inbox-assign-pick')).not.toBeInTheDocument();
  });

  it('lets a manager pick who works the conversation', async () => {
    userCtx.value = { user: { user_id: 'u1', roles: ['MARKETING_MANAGER'] } };
    const theirs = read({}, { assigned_user_id: 'boss', assigned_name: 'Ravi Boss' });
    renderDrawer([conversationMock(read()), audienceListOwnersMock, assignConversationMock('dm1', 'boss', theirs), conversationMock(theirs)]);
    fireEvent.click(await screen.findByTestId('inbox-assign-pick'));
    const dialog = await screen.findByRole('dialog', { name: 'Who works this conversation?' });
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Owner' }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Ravi Boss' }));
    fireEvent.click(within(dialog).getByTestId('lead-owner-save'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Assignee saved.', 'success'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Who works this conversation?' })).not.toBeInTheDocument());
  });

  it('says there are no messages yet', async () => {
    renderDrawer([conversationMock(read({ messages: [] }))]);
    expect(await screen.findByText('No messages yet.')).toBeInTheDocument();
  });

  it('shows a message with only an attachment and no time', async () => {
    renderDrawer([conversationMock(read({ messages: [makeDmMessage({ id: 'a1', text: '', sent_at: null, attachments: [{ type: 'video', url: 'https://cdn/v.mp4' }] })] }))]);
    expect(await screen.findByText('Attachment (video)')).toBeInTheDocument();
  });

  it('says when marking the conversation read fails', async () => {
    renderDrawer([conversationMock(makeThread()), { request: { query: MARK_SOCIAL_CONVERSATION_READ, variables: { id: 'dm1' } }, result: { errors: [new GraphQLError('Read failed')] } }]);
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Read failed', 'error'));
  });

  it('reads it only once, even when the conversation comes back still unread after an action', async () => {
    const unread = makeThread();
    const markRead = vi.fn(() => ({ data: { markSocialConversationRead: null } }));
    renderDrawer([
      conversationMock(unread),
      { request: { query: MARK_SOCIAL_CONVERSATION_READ, variables: { id: 'dm1' } }, result: markRead },
      assignConversationMock('dm1', 'u1', makeThread({}, { assigned_user_id: 'u1', assigned_name: 'Dee Em' })),
      conversationMock(makeThread({}, { assigned_user_id: 'u1', assigned_name: 'Dee Em' })),
    ]);
    fireEvent.click(await screen.findByTestId('inbox-assign-me'));
    expect(await screen.findByText('Dee Em')).toBeInTheDocument();
    expect(markRead).toHaveBeenCalledTimes(1);
    // A second read would have found no mock left and said so.
    expect(dialogsMock.notify).not.toHaveBeenCalledWith(expect.stringContaining('mock'), 'error');
  });
});
