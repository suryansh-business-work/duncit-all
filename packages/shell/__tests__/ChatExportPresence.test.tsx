import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildChatExport } from '../src/staff-chat/export-chat';
import { usePresence } from '../src/staff-chat/usePresence';
import type { StaffCall, StaffMessage } from '../src/staff-chat/queries';

const peer = { id: 'u1', name: 'Asha Rao', email: 'a@x.com', photo: '', roles: [] };

const message = (over: Partial<StaffMessage>): StaffMessage => ({
  id: 'm',
  from_user_id: 'me',
  to_user_id: 'u1',
  text: 'hello',
  created_at: '2026-08-06T10:00:00.000Z',
  ...over,
});

describe('chat export', () => {
  it('puts calls where they happened in the conversation, not in a separate list', () => {
    const messages = [
      message({ id: 'm1', created_at: '2026-08-06T10:00:00.000Z', text: 'first' }),
      message({ id: 'm2', created_at: '2026-08-06T10:10:00.000Z', text: 'last' }),
    ];
    const calls: StaffCall[] = [
      {
        id: 'c1',
        from_user_id: 'u1',
        to_user_id: 'me',
        kind: 'AUDIO',
        outcome: 'ANSWERED',
        duration_seconds: 95,
        started_at: '2026-08-06T10:05:00.000Z',
        ended_at: null,
      },
    ];

    const text = buildChatExport({ me: { id: 'me', name: 'Bo' }, peer, messages, calls });
    const body = text.split('\n').filter((line) => line.includes(':') && !line.startsWith('Exported'));

    // The call sits between the two messages, because that is when it happened.
    const firstAt = text.indexOf('first');
    const callAt = text.indexOf('audio call');
    const lastAt = text.indexOf('last');
    expect(firstAt).toBeLessThan(callAt);
    expect(callAt).toBeLessThan(lastAt);
    expect(text).toContain('answered, 1m 35s');
    expect(body.length).toBeGreaterThan(0);
  });

  it('says what happened to an edited or deleted message rather than hiding it', () => {
    const text = buildChatExport({
      me: { id: 'me', name: 'Bo' },
      peer,
      messages: [
        message({ id: 'm1', edited_at: '2026-08-06T10:01:00.000Z', text: 'fixed' }),
        message({ id: 'm2', deleted_at: '2026-08-06T10:02:00.000Z', text: '' }),
      ],
      calls: [],
    });
    expect(text).toContain('(edited)');
    expect(text).toContain('(message deleted)');
  });

  it('records an attachment as a name and a link, so the export still resolves', () => {
    const text = buildChatExport({
      me: { id: 'me', name: 'Bo' },
      peer,
      messages: [
        message({ text: '', attachment_url: 'https://ik.test/a.pdf', attachment_name: 'terms.pdf' }),
      ],
      calls: [],
    });
    expect(text).toContain('[file: terms.pdf — https://ik.test/a.pdf]');
  });
});

describe('presence', () => {
  const socket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as never;

  beforeEach(() => {
    vi.useFakeTimers();
    socket.emit.mockClear();
    globalThis.localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('goes away after ten idle minutes', () => {
    const { result } = renderHook(() => usePresence(socket, 'me'));
    expect(result.current.mine).toBe('ONLINE');

    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000 + 100);
    });
    expect(result.current.mine).toBe('AWAY');
    expect(socket.emit).toHaveBeenCalledWith('staff_status', 'AWAY');
  });

  it('does not drag a chosen status away — busy stays busy', () => {
    const { result } = renderHook(() => usePresence(socket, 'me'));
    act(() => result.current.choose('BUSY'));

    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });
    // Someone who set Busy did not ask to be marked Away ten minutes later.
    expect(result.current.mine).toBe('BUSY');
  });

  it('remembers the choice across a reload', () => {
    const first = renderHook(() => usePresence(socket, 'me'));
    act(() => first.result.current.choose('BUSY'));
    first.unmount();

    const second = renderHook(() => usePresence(socket, 'me'));
    expect(second.result.current.mine).toBe('BUSY');
  });

  it('reads a saved value that is not one of the four statuses as the default', () => {
    globalThis.localStorage.setItem('duncit_chat_status', 'NOT_A_STATUS');

    const { result } = renderHook(() => usePresence(socket, 'me'));

    expect(result.current.mine).toBe('ONLINE');
  });

  it('falls back to ONLINE when storage cannot even be read', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const { result } = renderHook(() => usePresence(socket, 'me'));

    expect(result.current.mine).toBe('ONLINE');
    spy.mockRestore();
  });

  it('keeps the chosen status for this session when storage refuses to save it', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    const { result } = renderHook(() => usePresence(socket, 'me'));

    act(() => {
      result.current.choose('BUSY');
    });

    expect(result.current.mine).toBe('BUSY');
    spy.mockRestore();
  });

  it('tracks a coworker from the socket, ignoring a blank id or its own', () => {
    const { result } = renderHook(() => usePresence(socket, 'me'));
    const onPresence = socket.on.mock.calls
      .filter(([event]: [string]) => event === 'staff_presence')
      .at(-1)?.[1];

    act(() => {
      onPresence?.({ user_id: '', status: 'ONLINE' });
      onPresence?.({ user_id: 'me', status: 'BUSY' });
    });
    expect(result.current.others).toEqual({});

    act(() => {
      onPresence?.({ user_id: 'u1', status: 'AWAY', last_seen: '2026-08-06T10:00:00.000Z' });
    });
    expect(result.current.statusOf('u1')).toBe('AWAY');
    expect(result.current.lastSeen.u1).toBe('2026-08-06T10:00:00.000Z');
    expect(result.current.statusOf('unheard-of')).toBe('OFFLINE');

    act(() => {
      onPresence?.({ user_id: 'u2', status: 'ONLINE' });
    });
    expect(result.current.lastSeen.u2).toBeUndefined();
  });

  it('re-arms the idle timer on activity, so it never fires while active', () => {
    const { result } = renderHook(() => usePresence(socket, 'me'));

    act(() => {
      vi.advanceTimersByTime(9 * 60 * 1000);
      globalThis.dispatchEvent(new Event('mousemove'));
      vi.advanceTimersByTime(9 * 60 * 1000);
    });

    expect(result.current.mine).toBe('ONLINE');
  });

  it('comes back online on activity, once the idle timer had marked it away', () => {
    const { result } = renderHook(() => usePresence(socket, 'me'));
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000 + 100);
    });
    expect(result.current.mine).toBe('AWAY');

    act(() => {
      globalThis.dispatchEvent(new Event('mousemove'));
    });

    expect(result.current.mine).toBe('ONLINE');
    expect(socket.emit).toHaveBeenCalledWith('staff_status', 'ONLINE');
  });

  it('leaves a status the reader chose alone on activity, even while marked away', () => {
    // Can only happen if BUSY/OFFLINE was chosen from another tab after this
    // one drifted to AWAY — activity here must not fight that choice.
    const { result } = renderHook(() => usePresence(socket, 'me'));
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000 + 100);
    });
    globalThis.localStorage.setItem('duncit_chat_status', 'BUSY');

    act(() => {
      globalThis.dispatchEvent(new Event('mousemove'));
    });

    expect(result.current.mine).toBe('AWAY');
  });
});
