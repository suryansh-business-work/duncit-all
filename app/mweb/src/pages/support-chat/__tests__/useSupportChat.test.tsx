import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';

import { useSupportChat } from '../SupportChatPage/useSupportChat';
import { opLink, type OpHandler } from '../../../__tests__/op-link';

const hoisted = vi.hoisted(() => ({
  download: vi.fn(),
  socket: { current: null as null | Record<string, (arg: any) => void> },
}));
vi.mock('../chatHelpers', async (orig) => ({
  ...(await orig<typeof import('../chatHelpers')>()),
  downloadBase64File: hoisted.download,
}));
vi.mock('../useSupportChatSocket', () => ({
  useSupportChatSocket: (params: Record<string, (arg: any) => void>) => {
    hoisted.socket.current = params;
    return { emitTyping: vi.fn() };
  },
}));

const session = {
  __typename: 'SupportChatSession',
  id: 's1',
  ticket_no: 'T-1',
  status: 'OPEN',
  agent_id: null,
  ai_active: true,
  handed_off: false,
  agent_last_read_at: null,
  user_last_read_at: null,
  rating: null,
  feedback_comment: null,
  feedback_at: null,
  resolved_at: null,
  reopen_deadline: null,
};
const msg = (id: string, over: Record<string, unknown> = {}) => ({
  __typename: 'SupportChatMessage',
  id,
  session_id: 's1',
  sender_id: 'u1',
  sender_role: 'USER',
  sender_name: 'Riya',
  sender_photo: null,
  text: `text ${id}`,
  attachments: [],
  is_ai: false,
  created_at: '2026-06-26T05:00:00.000Z',
  ...over,
});

let current: Record<string, unknown> | null;
function mount(extra: Record<string, OpHandler> = {}) {
  const ops = opLink({
    MySupportChat: () => ({ mySupportChat: current }),
    MySupportChatMessages: () => ({ supportChatMessages: [msg('m1')] }),
    MarkMySupportChatRead: () => ({ markSupportChatRead: { __typename: 'SupportChatSession', id: 's1', agent_last_read_at: null } }),
    ...extra,
  });
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} link={ops.link}>
      {children}
    </MockedProvider>
  );
  return { ops, ...renderHook(() => useSupportChat(), { wrapper }) };
}

beforeEach(() => {
  current = { ...session };
  hoisted.download.mockReset();
});

describe('useSupportChat', () => {
  it('loads the session and its messages and marks the thread read', async () => {
    const { result, ops } = mount();
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.sessionId).toBe('s1');
    expect(result.current.closed).toBe(false);
    expect(ops.callsTo('MarkMySupportChatRead')[0]?.variables).toEqual({ session_id: 's1' });
  });

  it('shows the message at once, swaps in the server copy, and shows the assistant typing until a reply', async () => {
    const { result, ops } = mount({
      SendMySupportChatMessage: () => ({ sendSupportChatMessage: msg('m2', { text: 'where is my booking' }) }),
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    act(() => result.current.send('where is my booking', []));
    expect(result.current.messages.at(-1)).toMatchObject({ pending: true, text: 'where is my booking' });
    expect(result.current.typingText).toBe('Duncit Assistant is typing…');

    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm2']));
    expect(ops.callsTo('SendMySupportChatMessage')[0]?.variables).toEqual({
      session_id: 's1',
      text: 'where is my booking',
      attachments: [],
    });

    act(() => hoisted.socket.current?.onMessage(msg('m3', { sender_role: 'AGENT', is_ai: true })));
    expect(result.current.typingText).toBeNull();
    // The same live message arriving twice is not duplicated.
    act(() => hoisted.socket.current?.onMessage(msg('m3', { sender_role: 'AGENT' })));
    expect(result.current.messages.filter((m) => m.id === 'm3')).toHaveLength(1);
    await waitFor(() => expect(ops.callsTo('MarkMySupportChatRead').length).toBeGreaterThan(1));
  });

  it('marks a failed send and delivers it on retry', async () => {
    let attempt = 0;
    const { result } = mount({
      SendMySupportChatMessage: () => {
        attempt += 1;
        if (attempt === 1) throw new Error('offline');
        return { sendSupportChatMessage: msg('m9', { text: 'again' }) };
      },
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    act(() => result.current.send('again', []));
    await waitFor(() => expect(result.current.messages.at(-1)?.failed).toBe(true));
    expect(result.current.typingText).toBeNull();

    const failed = result.current.messages.at(-1)!;
    act(() => result.current.retry(failed));
    await waitFor(() => expect(result.current.messages.at(-1)).toMatchObject({ id: 'm9' }));
    expect(result.current.messages.some((m) => m.failed)).toBe(false);
  });

  it('starts a chat first when there is no session yet, then sends into it', async () => {
    current = null;
    const { result, ops } = mount({
      StartSupportChat: () => ({ startSupportChat: session }),
      SendMySupportChatMessage: () => ({ sendSupportChatMessage: msg('m1') }),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.send('hello', ['https://cdn.example.test/a.png']));
    await waitFor(() => expect(ops.callsTo('SendMySupportChatMessage')).toHaveLength(1));
    expect(ops.callsTo('StartSupportChat')).toHaveLength(1);
    expect(ops.callsTo('SendMySupportChatMessage')[0]?.variables).toEqual({
      session_id: 's1',
      text: 'hello',
      attachments: ['https://cdn.example.test/a.png'],
    });
  });

  it('labels who is typing, and merges live session updates', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.sessionId).toBe('s1'));
    act(() => hoisted.socket.current?.onTyping({ role: 'AGENT', name: null }));
    expect(result.current.typingText).toBe('Support is typing…');
    act(() => hoisted.socket.current?.onTyping({ role: 'USER', name: 'Asha' }));
    expect(result.current.typingText).toBe('Asha is typing…');
    act(() => hoisted.socket.current?.onTyping({ role: 'USER', name: null }));
    expect(result.current.typingText).toBe('Someone is typing…');

    act(() => hoisted.socket.current?.onSession({ id: 's1', agent_last_read_at: '2026-06-26T06:00:00.000Z' }));
    expect(result.current.session?.agent_last_read_at).toBe('2026-06-26T06:00:00.000Z');
    expect(result.current.session?.ticket_no).toBe('T-1');
  });

  it('resolves the chat and then offers a re-open inside the window with the reason', async () => {
    const { result, ops } = mount({
      ResolveMySupportChat: () => ({ resolveSupportChat: { __typename: 'SupportChatSession', id: 's1', status: 'CLOSED' } }),
      ReopenMySupportChat: () => ({
        reopenSupportChat: { __typename: 'SupportChatSession', id: 's1', status: 'OPEN', resolved_at: null, reopen_deadline: null },
      }),
    });
    await waitFor(() => expect(result.current.sessionId).toBe('s1'));
    await act(async () => {
      await result.current.resolve();
    });
    expect(result.current.closed).toBe(true);
    // No deadline on the session: the window is treated as passed.
    expect(result.current.reopenable).toBe(false);

    act(() => hoisted.socket.current?.onSession({ id: 's1', reopen_deadline: '2099-01-01T00:00:00.000Z' }));
    expect(result.current.reopenable).toBe(true);

    await act(async () => {
      await result.current.reopen('still broken');
    });
    expect(ops.callsTo('ReopenMySupportChat')[0]?.variables).toEqual({ session_id: 's1', reason: 'still broken' });
    expect(result.current.closed).toBe(false);
  });

  it('rejects a re-open the server refuses and leaves the chat closed', async () => {
    current = { ...session, status: 'CLOSED' };
    const { result } = mount({
      ReopenMySupportChat: () => {
        throw new Error('Re-open window has passed');
      },
    });
    await waitFor(() => expect(result.current.closed).toBe(true));
    let message = '';
    await act(async () => {
      await result.current.reopen('').catch((e: Error) => {
        message = e.message;
      });
    });
    expect(message).toContain('window has passed');
    expect(result.current.closed).toBe(true);
  });

  it('downloads the transcript and records feedback on the session', async () => {
    const { result, ops } = mount({
      MySupportChatTranscript: () => ({
        supportChatTranscript: { __typename: 'Transcript', filename: 'chat.txt', text: 'hi', content_base64: 'aGk=' },
      }),
    });
    await waitFor(() => expect(result.current.sessionId).toBe('s1'));
    await act(async () => {
      await result.current.download('TXT');
    });
    expect(ops.callsTo('MySupportChatTranscript')[0]?.variables).toEqual({ session_id: 's1', format: 'TXT' });
    expect(hoisted.download).toHaveBeenCalledWith('chat.txt', 'aGk=', expect.stringContaining('text/plain'));

    act(() => result.current.applyFeedback(4, ''));
    expect(result.current.session).toMatchObject({ rating: 4, feedback_comment: null });
    act(() => result.current.applyFeedback(5, 'Great'));
    expect(result.current.session?.feedback_comment).toBe('Great');
  });
});
