import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LiveChatPage from '../../src/pages/live-chat/LiveChatPage';
import {
  MARK_SUPPORT_CHAT_READ,
  SEND_SUPPORT_CHAT_MESSAGE,
  SUPPORT_CHAT_MESSAGES,
  SUPPORT_CHAT_SESSIONS,
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

// Stub the media picker so an agent can attach a file without a real upload —
// lets us exercise the attachment-only send path (text → null).
vi.mock('@duncit/media-picker', () => ({
  ATTACHMENT_ACCEPT_ALL: 'image/*',
  AttachmentUploadField: ({ onChange }: any) => (
    <button type="button" onClick={() => onChange(['https://img/x.png'])}>
      mock-attach
    </button>
  ),
}));

const session = (id: string, name: string, over: Partial<SupportChatSession> = {}): SupportChatSession => ({
  id,
  ticket_no: `CH-${id}`,
  status: 'OPEN',
  last_message_at: new Date().toISOString(),
  last_message_preview: 'hi',
  unread_for_agent: 0,
  agent_id: 'a1', // already claimed → no claim mutation on select
  user_last_read_at: null,
  rating: null,
  feedback_comment: null,
  feedback_at: null,
  resolved_at: null,
  user: { id: `u-${id}`, name, phone: null, avatar_url: null },
  ...over,
});

const sessionsMock = (items: SupportChatSession[], status = 'OPEN') => ({
  request: { query: SUPPORT_CHAT_SESSIONS, variables: { status, search: null, page: 1, page_size: 25 } },
  result: { data: { supportChatSessions: { items, total: items.length, page: 1, page_size: 25 } } },
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

describe('LiveChatPage socket + composer branch coverage', () => {
  it('labels agent/anonymous typing, tracks a fresh session and sends an attachment-only message', async () => {
    const A = session('sess-a', 'Riya');
    const sendSpy = vi.fn();
    renderWithProviders(<LiveChatPage />, {
      mocks: [
        publicAppSettingsMock(),
        ...repeat(sessionsMock([A]), 6),
        ...repeat(sessionsMock([], 'CLOSED'), 3),
        ...repeat(messagesMock('sess-a', []), 3),
        ...repeat(markReadMock('sess-a'), 4),
        ...repeat(
          {
            request: { query: SEND_SUPPORT_CHAT_MESSAGE },
            variableMatcher: (vars: any) => {
              sendSpy(vars);
              return true;
            },
            result: { data: { sendSupportChatMessage: null } },
          },
          3,
        ),
      ],
    });

    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Riya')[0]);
    await waitFor(() =>
      expect(sockMock.ref.current.emit).toHaveBeenCalledWith('join_support_session', 'sess-a'),
    );

    // Agent typing → the fixed "Support is typing…" label (typingLabelFor AGENT).
    sockMock.events.onChatTyping({ session_id: 'sess-a', user_id: 'x', role: 'AGENT', name: 'Bot' });
    await waitFor(() => expect(screen.getByText(/support is typing/i)).toBeInTheDocument());
    // Second typing event for the same session → clears the previous debounce timer.
    sockMock.events.onChatTyping({ session_id: 'sess-a', user_id: 'x', role: 'AGENT', name: 'Bot' });

    // A brand-new live session carries an id → added to the "fresh" highlight set.
    sockMock.events.onChatSessionNew({ id: 'sess-new' });

    // Attachment-only send: attach a file, leave the text empty, press Enter.
    fireEvent.click(screen.getByText('mock-attach'));
    fireEvent.keyDown(screen.getByPlaceholderText('Type a message…'), { key: 'Enter' });
    await waitFor(() =>
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({ session_id: 'sess-a', text: null, attachments: ['https://img/x.png'] }),
      ),
    );

    // Switch to Resolved (empty list) but keep sess-a selected, then a USER types
    // with no name → falls back to "User", and the session is no longer in the
    // list so `sessions.find` is undefined (selected?.user.name ?? 'User').
    fireEvent.click(screen.getByRole('tab', { name: /resolved/i }));
    await waitFor(() => expect(screen.getByText(/no resolved chats/i)).toBeInTheDocument());
    sockMock.events.onChatTyping({ session_id: 'sess-a', user_id: 'x', role: 'USER', name: '' });
    // No throw + still on the resolved empty state.
    expect(screen.getByText(/no resolved chats/i)).toBeInTheDocument();
  });
});
