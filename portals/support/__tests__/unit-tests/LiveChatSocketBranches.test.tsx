import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LiveChatPage from '../../src/pages/live-chat/LiveChatPage';
import { renderWithProviders } from '../testkit';
import { publicAppSettingsMock } from '../mocks/common.mock';
import { markReadMock, messagesMock, sendMessageMock, session, sessionsMock } from '../mocks/supportChat.mock';

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

// Stub the media picker so an agent can attach a file without a real upload —
// lets us exercise the attachment-only send path (text → null).
vi.mock('@duncit/media-picker', () => ({
  ATTACHMENT_ACCEPT_ALL: 'image/*',
  AttachmentUploadField: ({ onChange }: { onChange: (urls: string[]) => void }) => (
    <button type="button" onClick={() => onChange(['https://img/x.png'])}>
      mock-attach
    </button>
  ),
}));

describe('LiveChatPage socket + composer branch coverage', () => {
  it('labels agent/anonymous typing, tracks a fresh session and sends an attachment-only message', async () => {
    const A = session('sess-a', 'Riya', { agent_id: 'a1' });
    const sendSpy = vi.fn();
    renderWithProviders(<LiveChatPage />, {
      mocks: [
        publicAppSettingsMock(),
        sessionsMock([A]),
        sessionsMock([], 'CLOSED'),
        messagesMock('sess-a', []),
        markReadMock('sess-a'),
        sendMessageMock({ message: null, onVars: sendSpy }),
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
