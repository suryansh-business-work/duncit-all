import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LiveChatPage from '../../src/pages/live-chat/LiveChatPage';
import {
  CLOSE_SUPPORT_CHAT,
  MARK_SUPPORT_CHAT_READ,
  SEND_SUPPORT_CHAT_MESSAGE,
  SUPPORT_CHAT_MESSAGES,
  SUPPORT_CHAT_SESSIONS,
  type SupportChatMessage,
  type SupportChatSession,
} from '../../src/graphql/supportChat';
import { renderWithProviders } from './testkit';

const sockMock = vi.hoisted(() => ({
  events: {} as Record<string, (p: any) => void>,
  ref: { current: { emit: vi.fn() } as any },
}));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, (p: any) => void>) => {
    sockMock.events = events;
    return sockMock.ref;
  },
}));

const session = (id: string, name: string): SupportChatSession => ({
  id,
  status: 'OPEN',
  last_message_at: new Date().toISOString(),
  last_message_preview: 'hi',
  unread_for_agent: 2,
  agent_id: null,
  user: { id: `u-${id}`, name, phone: '+919800000000', avatar_url: null },
});

const msg = (id: string, sessionId: string, role: SupportChatMessage['sender_role'], text: string): SupportChatMessage => ({
  id,
  session_id: sessionId,
  sender_id: 'x',
  sender_role: role,
  sender_name: 'X',
  sender_photo: null,
  text,
  attachments: [],
  created_at: new Date().toISOString(),
});

const sessionsMock = (sessions: SupportChatSession[]) => ({
  request: { query: SUPPORT_CHAT_SESSIONS, variables: { status: 'OPEN' } },
  result: { data: { supportChatSessions: sessions } },
});
const messagesMock = (sessionId: string, messages: SupportChatMessage[]) => ({
  request: { query: SUPPORT_CHAT_MESSAGES, variables: { session_id: sessionId, limit: 100 } },
  result: { data: { supportChatMessages: messages } },
});
const markReadMock = (sessionId: string) => ({
  request: { query: MARK_SUPPORT_CHAT_READ, variables: { session_id: sessionId } },
  result: { data: { markSupportChatRead: { id: sessionId, unread_for_agent: 0 } } },
});
const repeat = (m: any, n: number) => Array.from({ length: n }, () => ({ ...m }));

describe('LiveChatPage', () => {
  it('shows empty states when there are no open chats', async () => {
    renderWithProviders(<LiveChatPage />, { mocks: [sessionsMock([])] });
    await waitFor(() => expect(screen.getByText(/no open chats/i)).toBeInTheDocument());
    expect(screen.getByText(/select a session to open the chat/i)).toBeInTheDocument();
  });

  it('selects a session, sends messages, receives a live message and closes', async () => {
    const A = session('sess-a', 'Riya');
    const B = session('sess-b', 'Aman');
    renderWithProviders(<LiveChatPage />, {
      mocks: [
        ...repeat(sessionsMock([A, B]), 8),
        ...repeat(messagesMock('sess-a', [msg('m1', 'sess-a', 'USER', 'Hello there')]), 2),
        ...repeat(messagesMock('sess-b', []), 2),
        ...repeat(markReadMock('sess-a'), 3),
        ...repeat(markReadMock('sess-b'), 2),
        ...repeat({ request: { query: SEND_SUPPORT_CHAT_MESSAGE }, variableMatcher: () => true, result: { data: { sendSupportChatMessage: msg('echo', 'sess-a', 'AGENT', 'Reply') } } }, 4),
        { request: { query: CLOSE_SUPPORT_CHAT, variables: { session_id: 'sess-a' } }, result: { data: { closeSupportChat: { id: 'sess-a', status: 'CLOSED' } } } },
      ],
    });

    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    // The session name appears in both the list and (once open) the header, so
    // always click the first match — the sidebar list item.
    const openSession = (name: string) => fireEvent.click(screen.getAllByText(name)[0]);

    // Select session A.
    openSession('Riya');
    await waitFor(() => expect(screen.getByText('Hello there')).toBeInTheDocument());
    expect(sockMock.ref.current.emit).toHaveBeenCalledWith('join_support_session', 'sess-a');

    // Selecting A again is a no-op (early return).
    openSession('Riya');

    // Switch to B — covers leaving the previous session.
    openSession('Aman');
    await waitFor(() =>
      expect(sockMock.ref.current.emit).toHaveBeenCalledWith('leave_support_session', 'sess-a')
    );

    // Back to A and send via the button.
    openSession('Riya');
    await waitFor(() => expect(screen.getByText('Hello there')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Type a message…'), { target: { value: 'Reply' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Live inbound message appends once; duplicate id and other sessions ignored.
    sockMock.events.onChatMessage(msg('live-1', 'sess-a', 'AGENT', 'Live reply'));
    sockMock.events.onChatMessage(msg('live-1', 'sess-a', 'AGENT', 'Live reply'));
    sockMock.events.onChatMessage(msg('live-2', 'other', 'AGENT', 'Ignored'));
    // An attachment-only message (no text) covers the attachment-render branch.
    sockMock.events.onChatMessage({ ...msg('live-3', 'sess-a', 'USER', ''), attachments: ['https://img/c.png'] });
    await waitFor(() => expect(screen.getByText('Live reply')).toBeInTheDocument());
    expect(screen.queryByText('Ignored')).not.toBeInTheDocument();

    // Session list refetches on live session events.
    sockMock.events.onChatSessionNew();
    sockMock.events.onChatSessionUpdate();

    // Enter sends; Shift+Enter and empty Enter do not.
    fireEvent.change(screen.getByPlaceholderText('Type a message…'), { target: { value: 'Via enter' } });
    fireEvent.keyDown(screen.getByPlaceholderText('Type a message…'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByPlaceholderText('Type a message…'), { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(screen.getByPlaceholderText('Type a message…'), { key: 'Enter' });

    // Close the conversation.
    fireEvent.click(screen.getByLabelText('Close chat'));
  });
});
