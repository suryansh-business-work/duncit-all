import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LiveChatPage from '../../src/pages/live-chat/LiveChatPage';
import { renderWithProviders } from '../testkit';
import { publicAppSettingsMock } from '../mocks/common.mock';
import {
  chatMessage,
  claimChatMock,
  closeChatMock,
  emailChatTranscriptMock,
  chatTranscriptMock,
  markReadMock,
  messagesMock,
  reopenChatMock,
  sendMessageMock,
  session,
  sessionsMock,
} from '../mocks/supportChat.mock';

const sockMock = vi.hoisted(() => ({
  events: {} as Record<string, (...args: unknown[]) => void>,
  ref: { current: { emit: vi.fn() } as { emit: ReturnType<typeof vi.fn> } },
}));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, (...args: unknown[]) => void>) => {
    sockMock.events = events;
    return sockMock.ref;
  },
}));

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
    const A = session('sess-a', 'Riya', { unread_for_agent: 2 });
    const B = session('sess-b', 'Aman', { unread_for_agent: 2 });
    renderWithProviders(<LiveChatPage />, {
      mocks: [
        publicAppSettingsMock(),
        sessionsMock([A, B]),
        messagesMock('sess-a', [
          chatMessage('m1', 'sess-a', 'USER', 'Hello there'),
          chatMessage('ai1', 'sess-a', 'AGENT', 'AI reply', { is_ai: true }),
          chatMessage('sys1', 'sess-a', 'SYSTEM', 'Support executive Sam will be assisting you now.'),
        ]),
        messagesMock('sess-b', []),
        markReadMock('sess-a'),
        markReadMock('sess-b'),
        // sess-a / sess-b start unclaimed (agent_id null) → selecting them claims.
        claimChatMock('sess-a'),
        claimChatMock('sess-b'),
        sendMessageMock({ message: chatMessage('echo', 'sess-a', 'AGENT', 'Reply') }),
        closeChatMock({ id: 'sess-a' }),
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

    sockMock.events.onChatMessage(chatMessage('live-1', 'sess-a', 'AGENT', 'Live reply'));
    sockMock.events.onChatMessage(chatMessage('live-1', 'sess-a', 'AGENT', 'Live reply'));
    sockMock.events.onChatMessage(chatMessage('live-2', 'other', 'AGENT', 'Ignored'));
    sockMock.events.onChatMessage(chatMessage('live-3', 'sess-a', 'USER', '', { attachments: ['https://img/c.png'] }));
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
        messagesMock('sess-c', [chatMessage('m1', 'sess-c', 'AGENT', 'All sorted')]),
        markReadMock('sess-c'),
        reopenChatMock({ id: 'sess-c' }),
        chatTranscriptMock({ id: 'sess-c', format: 'TXT' }),
        emailChatTranscriptMock({ id: 'sess-c', email: 'q@e.com' }),
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
    const open = session('sess-e', 'Dev', { agent_id: 'a1' });
    renderWithProviders(<LiveChatPage />, {
      mocks: [
        publicAppSettingsMock(),
        sessionsMock([open], 'OPEN'),
        messagesMock('sess-e', []),
        markReadMock('sess-e'),
        closeChatMock({ id: 'sess-e', error: 'Resolve failed' }),
        chatTranscriptMock({ id: 'sess-e', format: 'TXT', error: 'Export failed' }),
        emailChatTranscriptMock({ id: 'sess-e', email: 'x@e.com', error: 'Email failed' }),
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
