import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LiveChatPage from '../../src/pages/live-chat/LiveChatPage';
import {
  CLOSE_SUPPORT_CHAT,
  EMAIL_SUPPORT_CHAT_TRANSCRIPT,
  MARK_SUPPORT_CHAT_READ,
  REOPEN_SUPPORT_CHAT,
  SEND_SUPPORT_CHAT_MESSAGE,
  SUPPORT_CHAT_MESSAGES,
  SUPPORT_CHAT_SESSIONS,
  SUPPORT_CHAT_TRANSCRIPT,
  type SupportChatMessage,
  type SupportChatSession,
} from '../../src/graphql/supportChat';
import { renderWithProviders, publicAppSettingsMock } from './testkit';

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

const session = (id: string, name: string, over: Partial<SupportChatSession> = {}): SupportChatSession => ({
  id,
  ticket_no: `CH-${id.toUpperCase()}`,
  status: 'OPEN',
  last_message_at: new Date().toISOString(),
  last_message_preview: 'hi',
  unread_for_agent: 2,
  agent_id: null,
  user_last_read_at: null,
  rating: null,
  feedback_comment: null,
  feedback_at: null,
  resolved_at: null,
  user: { id: `u-${id}`, name, phone: '+919800000000', avatar_url: null },
  ...over,
});

const msg = (
  id: string,
  sessionId: string,
  role: SupportChatMessage['sender_role'],
  text: string,
  over: Partial<SupportChatMessage> = {},
): SupportChatMessage => ({
  id,
  session_id: sessionId,
  sender_id: 'x',
  sender_role: role,
  sender_name: 'X',
  sender_photo: null,
  text,
  attachments: [],
  is_ai: false,
  created_at: new Date().toISOString(),
  ...over,
});

const sessionsMock = (sessions: SupportChatSession[], status = 'OPEN') => ({
  request: { query: SUPPORT_CHAT_SESSIONS, variables: { status } },
  result: { data: { supportChatSessions: sessions } },
  maxUsageCount: 30,
});
const messagesMock = (sessionId: string, messages: SupportChatMessage[]) => ({
  request: { query: SUPPORT_CHAT_MESSAGES, variables: { session_id: sessionId, limit: 100 } },
  result: { data: { supportChatMessages: messages } },
  maxUsageCount: 10,
});
const markReadMock = (sessionId: string) => ({
  request: { query: MARK_SUPPORT_CHAT_READ, variables: { session_id: sessionId } },
  result: { data: { markSupportChatRead: { id: sessionId, unread_for_agent: 0 } } },
  maxUsageCount: 10,
});
const repeat = (m: any, n: number) => Array.from({ length: n }, () => ({ ...m }));

describe('LiveChatPage', () => {
  it('shows empty states and switches the OPEN/RESOLVED filter', async () => {
    renderWithProviders(<LiveChatPage />, {
      mocks: [publicAppSettingsMock(), sessionsMock([]), sessionsMock([], 'CLOSED')],
    });
    await waitFor(() => expect(screen.getByText(/no open chats/i)).toBeInTheDocument());
    expect(screen.getByText(/select a session to open the chat/i)).toBeInTheDocument();

    // Flip to the Resolved tab — fetches CLOSED sessions, different empty copy.
    fireEvent.click(screen.getByRole('tab', { name: /resolved/i }));
    await waitFor(() => expect(screen.getByText(/no resolved chats/i)).toBeInTheDocument());
  });

  it('selects a session, renders AI badge + ticks, sends, receives live, resolves', async () => {
    const A = session('sess-a', 'Riya');
    const B = session('sess-b', 'Aman');
    renderWithProviders(<LiveChatPage />, {
      mocks: [
        publicAppSettingsMock(),
        ...repeat(sessionsMock([A, B]), 8),
        ...repeat(
          messagesMock('sess-a', [
            msg('m1', 'sess-a', 'USER', 'Hello there'),
            msg('ai1', 'sess-a', 'AGENT', 'AI reply', { is_ai: true }),
            msg('sys1', 'sess-a', 'SYSTEM', 'Support executive Sam will be assisting you now.'),
          ]),
          2,
        ),
        ...repeat(messagesMock('sess-b', []), 2),
        ...repeat(markReadMock('sess-a'), 3),
        ...repeat(markReadMock('sess-b'), 2),
        ...repeat({ request: { query: SEND_SUPPORT_CHAT_MESSAGE }, variableMatcher: () => true, result: { data: { sendSupportChatMessage: msg('echo', 'sess-a', 'AGENT', 'Reply') } } }, 4),
        { request: { query: CLOSE_SUPPORT_CHAT, variables: { session_id: 'sess-a' } }, result: { data: { closeSupportChat: { id: 'sess-a', status: 'CLOSED', resolved_at: new Date().toISOString() } } } },
      ],
    });

    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    const openSession = (name: string) => fireEvent.click(screen.getAllByText(name)[0]);

    openSession('Riya');
    await waitFor(() => expect(screen.getByText('Hello there')).toBeInTheDocument());
    // AI badge + SYSTEM timeline chip render.
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText(/will be assisting you now/i)).toBeInTheDocument();
    // Agent's own outgoing bubble carries a delivered/seen tick.
    expect(screen.getByLabelText(/delivered|seen/i)).toBeInTheDocument();
    expect(sockMock.ref.current.emit).toHaveBeenCalledWith('join_support_session', 'sess-a');

    openSession('Riya'); // no-op (early return)
    openSession('Aman');
    await waitFor(() => expect(sockMock.ref.current.emit).toHaveBeenCalledWith('leave_support_session', 'sess-a'));

    openSession('Riya');
    await waitFor(() => expect(screen.getByText('Hello there')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Type a message…'), { target: { value: 'Reply' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    sockMock.events.onChatMessage(msg('live-1', 'sess-a', 'AGENT', 'Live reply'));
    sockMock.events.onChatMessage(msg('live-1', 'sess-a', 'AGENT', 'Live reply'));
    sockMock.events.onChatMessage(msg('live-2', 'other', 'AGENT', 'Ignored'));
    sockMock.events.onChatMessage({ ...msg('live-3', 'sess-a', 'USER', ''), attachments: ['https://img/c.png'] });
    await waitFor(() => expect(screen.getByText('Live reply')).toBeInTheDocument());
    expect(screen.queryByText('Ignored')).not.toBeInTheDocument();

    sockMock.events.onChatSessionNew();
    sockMock.events.onChatSessionUpdate();

    // Typing label reads the peer from the new { role, name } payload.
    sockMock.events.onChatTyping({ session_id: 'sess-a', user_id: 'u', role: 'USER', name: 'Riya' });
    await waitFor(() => expect(screen.getByText(/Riya is typing…/i)).toBeInTheDocument());
    sockMock.events.onChatTyping({ session_id: 'other', user_id: 'u', role: 'USER', name: 'X' });

    fireEvent.change(screen.getByPlaceholderText('Type a message…'), { target: { value: 'Via enter' } });
    fireEvent.keyDown(screen.getByPlaceholderText('Type a message…'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByPlaceholderText('Type a message…'), { key: 'Enter', shiftKey: true });

    // Resolve flow: opens the confirm dialog, then closes the chat.
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
    await waitFor(() => expect(screen.getByText(/mark this chat resolved\?/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));
  });

  it('shows a resolved banner + feedback, supports reopen and transcript export', async () => {
    const resolved = session('sess-c', 'Maya', {
      status: 'CLOSED',
      resolved_at: new Date().toISOString(),
      rating: 5,
      feedback_comment: 'Great help!',
      user_last_read_at: new Date().toISOString(),
    });
    renderWithProviders(<LiveChatPage />, {
      mocks: [
        publicAppSettingsMock(),
        sessionsMock([], 'OPEN'),
        sessionsMock([resolved], 'CLOSED'),
        messagesMock('sess-c', [msg('m1', 'sess-c', 'AGENT', 'All sorted')]),
        markReadMock('sess-c'),
        { request: { query: REOPEN_SUPPORT_CHAT, variables: { session_id: 'sess-c', reason: null } }, result: { data: { reopenSupportChat: { id: 'sess-c', status: 'OPEN', resolved_at: null } } } },
        { request: { query: SUPPORT_CHAT_TRANSCRIPT, variables: { session_id: 'sess-c', format: 'TXT' } }, result: { data: { supportChatTranscript: { filename: 'support-CH-C.txt', text: 'hi', content_base64: 'aGk=' } } } },
        { request: { query: EMAIL_SUPPORT_CHAT_TRANSCRIPT, variables: { session_id: 'sess-c', email: 'q@e.com', format: 'DOCX' } }, result: { data: { emailSupportChatTranscript: true } } },
      ],
    });

    // Start on the Resolved tab to load the CLOSED session.
    fireEvent.click(screen.getByRole('tab', { name: /resolved/i }));
    await waitFor(() => expect(screen.getByText('Maya')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Maya')[0]);

    await waitFor(() => expect(screen.getByText(/marked as resolved/i)).toBeInTheDocument());
    // Feedback panel shows the emoji rating + comment; composer is hidden.
    expect(screen.getByText(/Very Satisfied/i)).toBeInTheDocument();
    expect(screen.getByText(/Great help!/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type a message…')).not.toBeInTheDocument();

    // Download a .txt transcript.
    fireEvent.click(screen.getByLabelText('Export transcript'));
    fireEvent.click(await screen.findByText('Download .txt'));
    await waitFor(() => expect(screen.queryByText('Download .txt')).not.toBeInTheDocument());

    // Email a transcript.
    fireEvent.click(screen.getByLabelText('Export transcript'));
    fireEvent.click(await screen.findByText(/email transcript/i));
    fireEvent.change(screen.getByLabelText(/recipient email/i), { target: { value: 'q@e.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await waitFor(() => expect(screen.queryByLabelText(/recipient email/i)).not.toBeInTheDocument());

    // Re-open the chat.
    fireEvent.click(await screen.findByRole('button', { name: /re-open/i }));
  });

  it('surfaces resolve + transcript errors in a snackbar', async () => {
    const open = session('sess-e', 'Dev');
    renderWithProviders(<LiveChatPage />, {
      mocks: [
        publicAppSettingsMock(),
        sessionsMock([open], 'OPEN'),
        messagesMock('sess-e', []),
        markReadMock('sess-e'),
        { request: { query: CLOSE_SUPPORT_CHAT, variables: { session_id: 'sess-e' } }, error: new Error('Resolve failed') },
        { request: { query: SUPPORT_CHAT_TRANSCRIPT, variables: { session_id: 'sess-e', format: 'TXT' } }, error: new Error('Export failed') },
        { request: { query: EMAIL_SUPPORT_CHAT_TRANSCRIPT, variables: { session_id: 'sess-e', email: 'x@e.com', format: 'DOCX' } }, error: new Error('Email failed') },
      ],
    });
    await waitFor(() => expect(screen.getByText('Dev')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Dev')[0]);
    await waitFor(() => expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
    fireEvent.click(await screen.findByRole('button', { name: /mark resolved/i }));
    await waitFor(() => expect(screen.getByText(/resolve failed/i)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Export transcript'));
    fireEvent.click(await screen.findByText('Download .txt'));
    await waitFor(() => expect(screen.getByText(/export failed/i)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Export transcript'));
    fireEvent.click(await screen.findByText(/email transcript/i));
    fireEvent.change(screen.getByLabelText(/recipient email/i), { target: { value: 'x@e.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await waitFor(() => expect(screen.getByText(/email failed/i)).toBeInTheDocument());
  });
});
