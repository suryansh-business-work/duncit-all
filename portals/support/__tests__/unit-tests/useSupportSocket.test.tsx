import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { appConfig } from '../../src/config/app-config';
import { useSupportSocket, type SupportSocketEvents } from '../../src/lib/useSupportSocket';

const sock = vi.hoisted(() => {
  const handlers: Record<string, (payload: unknown) => void> = {};
  const socket = {
    on: vi.fn((event: string, cb: (payload: unknown) => void) => {
      handlers[event] = cb;
    }),
    emit: vi.fn(),
    removeAllListeners: vi.fn(),
    disconnect: vi.fn(),
  };
  return { handlers, socket, io: vi.fn(() => socket) };
});

vi.mock('socket.io-client', () => ({ io: sock.io }));

function stubAudio() {
  const node: Record<string, unknown> = {
    frequency: {},
    type: '',
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    start: vi.fn(),
    stop: vi.fn(),
  };
  node.connect = vi.fn(() => node);
  const ctx = {
    currentTime: 0,
    destination: {},
    createOscillator: () => node,
    createGain: () => node,
    close: () => Promise.resolve(),
  };
  vi.stubGlobal('AudioContext', vi.fn(() => ctx));
}

beforeEach(() => {
  sock.io.mockClear();
  sock.socket.on.mockClear();
  sock.socket.removeAllListeners.mockClear();
  sock.socket.disconnect.mockClear();
  Object.keys(sock.handlers).forEach((k) => delete sock.handlers[k]);
  localStorage.setItem(appConfig.tokenKey, 'tok');
  stubAudio();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('useSupportSocket', () => {
  it('does not connect without an auth token', () => {
    localStorage.clear();
    const { result } = renderHook(() => useSupportSocket({}));
    expect(sock.io).not.toHaveBeenCalled();
    expect(result.current.current).toBeNull();
  });

  it('connects and routes every server event to its handler', () => {
    const events: Required<Pick<SupportSocketEvents,
      'onSos' | 'onSosUpdate' | 'onCallback' | 'onCallbackUpdate' | 'onFeedback' |
      'onTicketNew' | 'onTicketUpdate' | 'onChatSessionNew' | 'onChatSessionUpdate' | 'onChatMessage'>> = {
      onSos: vi.fn(),
      onSosUpdate: vi.fn(),
      onCallback: vi.fn(),
      onCallbackUpdate: vi.fn(),
      onFeedback: vi.fn(),
      onTicketNew: vi.fn(),
      onTicketUpdate: vi.fn(),
      onChatSessionNew: vi.fn(),
      onChatSessionUpdate: vi.fn(),
      onChatMessage: vi.fn(),
    };
    const { result } = renderHook(() => useSupportSocket(events));
    expect(sock.io).toHaveBeenCalledTimes(1);
    expect(result.current.current).toBe(sock.socket);

    sock.handlers['bouncer:sos_new']({ id: 1 });
    sock.handlers['bouncer:sos_update']({ id: 2 });
    sock.handlers['bouncer:callback_new']({ id: 3 });
    sock.handlers['bouncer:callback_update']({ id: 4 });
    sock.handlers['bouncer:feedback_new']({ id: 5 });
    sock.handlers['ticket:new']({ id: 6 });
    sock.handlers['ticket:update']({ id: 7 });
    sock.handlers['support_chat:session_new']({ id: 8 });
    sock.handlers['support_chat:session_update']({ id: 9 });
    sock.handlers['support_chat:message']({ id: 10 });

    expect(events.onSos).toHaveBeenCalledWith({ id: 1 });
    expect(events.onSosUpdate).toHaveBeenCalledWith({ id: 2 });
    expect(events.onCallback).toHaveBeenCalledWith({ id: 3 });
    expect(events.onCallbackUpdate).toHaveBeenCalledWith({ id: 4 });
    expect(events.onFeedback).toHaveBeenCalledWith({ id: 5 });
    expect(events.onTicketNew).toHaveBeenCalledWith({ id: 6 });
    expect(events.onTicketUpdate).toHaveBeenCalledWith({ id: 7 });
    expect(events.onChatSessionNew).toHaveBeenCalledWith({ id: 8 });
    expect(events.onChatSessionUpdate).toHaveBeenCalledWith({ id: 9 });
    expect(events.onChatMessage).toHaveBeenCalledWith({ id: 10 });
  });

  it('tolerates events with no handlers attached (optional chaining)', () => {
    renderHook(() => useSupportSocket({}));
    expect(() => {
      sock.handlers['bouncer:sos_new']({});
      sock.handlers['bouncer:sos_update']({});
      sock.handlers['bouncer:callback_new']({});
      sock.handlers['bouncer:callback_update']({});
      sock.handlers['bouncer:feedback_new']({});
      sock.handlers['ticket:new']({});
      sock.handlers['ticket:update']({});
      sock.handlers['support_chat:session_new']({});
      sock.handlers['support_chat:session_update']({});
      sock.handlers['support_chat:message']({});
    }).not.toThrow();
  });

  it('skips the beep silently when Web Audio is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    const onSos = vi.fn();
    renderHook(() => useSupportSocket({ onSos }));
    expect(() => sock.handlers['bouncer:sos_new']({})).not.toThrow();
    expect(onSos).toHaveBeenCalled();
  });

  it('swallows Web Audio errors', () => {
    vi.stubGlobal('AudioContext', vi.fn(() => {
      throw new Error('blocked');
    }));
    const onSos = vi.fn();
    renderHook(() => useSupportSocket({ onSos }));
    expect(() => sock.handlers['bouncer:sos_new']({})).not.toThrow();
    expect(onSos).toHaveBeenCalled();
  });

  it('tears the socket down on unmount', () => {
    const { unmount } = renderHook(() => useSupportSocket({}));
    unmount();
    expect(sock.socket.removeAllListeners).toHaveBeenCalled();
    expect(sock.socket.disconnect).toHaveBeenCalled();
  });
});
