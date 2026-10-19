import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { useSupportChat } from '../SupportChatPage/useSupportChat';
import { opLink, type OpHandler } from '../../../__tests__/op-link';

const socket = vi.hoisted(() => ({ current: null as null | { onMessage: (m: unknown) => void } }));
vi.mock('../useSupportChatSocket', () => ({
  useSupportChatSocket: (params: { onMessage: (m: unknown) => void }) => {
    socket.current = params;
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
/** Line `n` of the thread: a higher n is newer. */
const msg = (n: number) => ({
  __typename: 'SupportChatMessage',
  id: `m${n}`,
  session_id: 's1',
  sender_id: 'u1',
  sender_role: 'USER',
  sender_name: 'Riya',
  sender_photo: null,
  text: `text ${n}`,
  attachments: [],
  is_ai: false,
  created_at: new Date(Date.UTC(2026, 9, 1, 0, n)).toISOString(),
});
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => msg(from + i));

function mount(messages: OpHandler) {
  const ops = opLink({
    MySupportChat: () => ({ mySupportChat: session }),
    MySupportChatMessages: messages,
    MarkMySupportChatRead: () => ({
      markSupportChatRead: { __typename: 'SupportChatSession', id: 's1', agent_last_read_at: null },
    }),
  });
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} link={ops.link}>
      {children}
    </MockedProvider>
  );
  return { ops, ...renderHook(() => useSupportChat(), { wrapper }) };
}

const ids = (list: ReadonlyArray<{ id: string }>) => list.map((m) => m.id);

describe('useSupportChat scroll-up history', () => {
  it('opens on the newest 30 lines, then puts older pages in front until a short page', async () => {
    const { result, ops } = mount((variables) => {
      if (!variables.before) return { supportChatMessages: range(31, 60) };
      if (variables.before === msg(31).created_at) return { supportChatMessages: [...range(2, 30), msg(31)] };
      return { supportChatMessages: [msg(1)] };
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(30));
    expect(ops.callsTo('MySupportChatMessages')[0].variables).toEqual({ session_id: 's1', limit: 30 });
    expect(result.current.canLoadOlder).toBe(true);

    // A live line arrives before the reader scrolls up: it stays at the end.
    act(() => socket.current?.onMessage(msg(61)));
    await act(() => result.current.loadOlder());
    expect(ops.callsTo('MySupportChatMessages')[1].variables).toEqual({
      session_id: 's1',
      limit: 30,
      before: msg(31).created_at,
    });
    // Oldest first, the shared line once, the live line last.
    expect(ids(result.current.messages)).toEqual(ids(range(2, 61)));
    expect(result.current.canLoadOlder).toBe(true);

    await act(() => result.current.loadOlder());
    expect(ids(result.current.messages)[0]).toBe('m1');
    expect(result.current.canLoadOlder).toBe(false);
  });

  it('has nothing older to ask for when the first page is short', async () => {
    const { result, ops } = mount(() => ({ supportChatMessages: range(1, 4) }));
    await waitFor(() => expect(result.current.messages).toHaveLength(4));
    expect(result.current.canLoadOlder).toBe(false);
    expect(ops.callsTo('MySupportChatMessages')).toHaveLength(1);
  });

  it('rejects a failed page and keeps every line shown', async () => {
    const { result } = mount((variables) => {
      if (variables.before) throw new Error('offline');
      return { supportChatMessages: range(31, 60) };
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(30));
    await expect(act(() => result.current.loadOlder())).rejects.toThrow();
    expect(result.current.messages).toHaveLength(30);
    expect(result.current.canLoadOlder).toBe(true);
  });
});
