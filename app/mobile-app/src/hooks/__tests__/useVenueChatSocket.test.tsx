import { act, renderHook, waitFor } from '@testing-library/react-native';
import { io } from 'socket.io-client';

import { getAuthToken } from '@/services/auth-token';
import { useVenueChatSocket } from '@/hooks/useVenueChatSocket';

jest.mock('socket.io-client', () => ({ io: jest.fn() }));
jest.mock('@/services/auth-token', () => ({ getAuthToken: jest.fn() }));
const mockWarn = jest.fn();
const mockError = jest.fn();
jest.mock('@duncit/logs', () => ({
  logs: {
    mobileApp: {
      warn: (...args: unknown[]) => mockWarn(...args),
      error: (...args: unknown[]) => mockError(...args),
      // The app's config logs its API origin on load in dev.
      info: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

const mockIo = io as jest.Mock;
const mockToken = getAuthToken as jest.Mock;

type Handler = (...args: unknown[]) => void;
function fakeSocket() {
  const handlers = new Map<string, Handler>();
  return {
    on: jest.fn((event: string, handler: Handler) => {
      handlers.set(event, handler);
    }),
    emit: jest.fn(),
    disconnect: jest.fn(),
    /** Invoke a registered handler as the server would. */
    fire: (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
  };
}

const callbacks = () => ({
  onLine: jest.fn(),
  onUpdate: jest.fn(),
  onRemove: jest.fn(),
  onRead: jest.fn(),
  onJoinFailed: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useVenueChatSocket', () => {
  it('joins the thread and hands each kind of frame to its own handler, then leaves', async () => {
    const socket = fakeSocket();
    mockIo.mockReturnValue(socket);
    mockToken.mockResolvedValue('jwt');
    const cbs = callbacks();
    const { unmount } = renderHook(() => useVenueChatSocket({ podId: 'pod-1', ...cbs }));
    await waitFor(() => expect(mockIo).toHaveBeenCalled());
    expect(mockIo.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ auth: { token: 'jwt' } }));

    act(() => socket.fire('connect'));
    expect(socket.emit).toHaveBeenCalledWith('join_venue_chat', 'pod-1', expect.any(Function));

    const line = { id: 'l1', pod_id: 'pod-1', text: 'Hi' };
    act(() => socket.fire('venue_chat_message', line));
    expect(cbs.onLine).toHaveBeenCalledWith(line);

    const edited = { ...line, text: 'Hi there', edited_at: '2026-08-29T10:02:00.000Z' };
    act(() => socket.fire('venue_chat_update', edited));
    expect(cbs.onUpdate).toHaveBeenCalledWith(edited);

    act(() => socket.fire('venue_chat_delete', { id: 'l1', pod_id: 'pod-1' }));
    expect(cbs.onRemove).toHaveBeenCalledWith('l1');

    const mark = {
      pod_id: 'pod-1',
      user_id: 'owner-1',
      side: 'VENUE',
      name: 'Court House',
      photo: null,
      last_read_at: '2026-08-29T10:03:00.000Z',
    };
    act(() => socket.fire('venue_chat_read', mark));
    expect(cbs.onRead).toHaveBeenCalledWith(mark);
    // Each frame went to its own handler only.
    expect(cbs.onLine).toHaveBeenCalledTimes(1);
    expect(cbs.onUpdate).toHaveBeenCalledTimes(1);

    unmount();
    expect(socket.emit).toHaveBeenCalledWith('leave_venue_chat', 'pod-1');
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('says a refused join or a failed connection, and logs both', async () => {
    const socket = fakeSocket();
    mockIo.mockReturnValue(socket);
    mockToken.mockResolvedValue('jwt');
    const cbs = callbacks();
    renderHook(() => useVenueChatSocket({ podId: 'pod-1', ...cbs }));
    await waitFor(() => expect(mockIo).toHaveBeenCalled());
    act(() => socket.fire('connect'));
    const ack = socket.emit.mock.calls.find((call) => call[0] === 'join_venue_chat')?.[2] as (
      ok: boolean,
      err?: string,
    ) => void;
    act(() => ack(true));
    expect(cbs.onJoinFailed).not.toHaveBeenCalled();
    act(() => ack(false, 'FORBIDDEN'));
    expect(cbs.onJoinFailed).toHaveBeenLastCalledWith('FORBIDDEN');
    act(() => ack(false));
    expect(cbs.onJoinFailed).toHaveBeenLastCalledWith('ERROR');
    act(() => socket.fire('connect_error', new Error('offline')));
    expect(cbs.onJoinFailed).toHaveBeenCalledTimes(3);
    expect(mockWarn).toHaveBeenCalledWith('venueChat', 'connect', {
      podId: 'pod-1',
      error: expect.any(Error),
    });
  });

  it('connects nothing until the thread is known, nor without a token', async () => {
    renderHook(() => useVenueChatSocket({ podId: null, ...callbacks() }));
    expect(mockToken).not.toHaveBeenCalled();

    mockToken.mockResolvedValue(null);
    renderHook(() => useVenueChatSocket({ podId: 'pod-1', ...callbacks() }));
    await waitFor(() => expect(mockToken).toHaveBeenCalled());
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('logs a token that could not be read', async () => {
    mockToken.mockRejectedValue(new Error('keychain'));
    renderHook(() => useVenueChatSocket({ podId: 'pod-1', ...callbacks() }));
    await waitFor(() =>
      expect(mockError).toHaveBeenCalledWith('venueChat', 'token', {
        error: expect.any(Error),
        podId: 'pod-1',
      }),
    );
  });
});
