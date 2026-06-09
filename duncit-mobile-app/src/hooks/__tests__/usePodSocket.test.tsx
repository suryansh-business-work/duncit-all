import { act, renderHook, waitFor } from '@testing-library/react-native';
import { io } from 'socket.io-client';

import { getAuthToken } from '@/services/auth-token';
import { usePodSocket } from '@/hooks/usePodSocket';

jest.mock('socket.io-client', () => ({ io: jest.fn() }));
jest.mock('@/services/auth-token', () => ({ getAuthToken: jest.fn() }));

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
  onMessage: jest.fn(),
  onReaction: jest.fn(),
  onDeleted: jest.fn(),
  onError: jest.fn(),
});

beforeEach(() => {
  mockIo.mockReset();
  mockToken.mockReset();
});

describe('usePodSocket', () => {
  it('connects, joins, forwards scoped events and cleans up', async () => {
    const socket = fakeSocket();
    mockIo.mockReturnValue(socket);
    mockToken.mockResolvedValue('jwt');
    const cbs = callbacks();

    const { unmount } = renderHook(() => usePodSocket({ podId: 'p1', ...cbs }));
    await waitFor(() => expect(mockIo).toHaveBeenCalled());

    act(() => socket.fire('connect'));
    const ack = socket.emit.mock.calls.find((c) => c[0] === 'join_pod')?.[2] as (
      ok: boolean,
      err?: string,
    ) => void;
    act(() => ack(false, 'FORBIDDEN'));
    expect(cbs.onError).toHaveBeenCalledWith('FORBIDDEN');
    act(() => ack(false));
    expect(cbs.onError).toHaveBeenCalledWith('Cannot join chat');
    act(() => ack(true)); // ok → no further error

    act(() => socket.fire('message', { id: 'm1', pod_id: 'p1' }));
    act(() => socket.fire('message', { id: 'm2', pod_id: 'other' }));
    expect(cbs.onMessage).toHaveBeenCalledTimes(1);

    act(() => socket.fire('reaction', { id: 'm1', pod_id: 'p1' }));
    act(() => socket.fire('reaction', { id: 'm1', pod_id: 'other' }));
    expect(cbs.onReaction).toHaveBeenCalledTimes(1);

    act(() => socket.fire('deleted', { id: 'm1', pod_id: 'p1' }));
    act(() => socket.fire('deleted', { id: 'm1', pod_id: 'other' }));
    expect(cbs.onDeleted).toHaveBeenCalledTimes(1);

    act(() => socket.fire('connect_error', { message: 'boom' }));
    expect(cbs.onError).toHaveBeenCalledWith('boom');
    act(() => socket.fire('connect_error', {}));
    expect(cbs.onError).toHaveBeenCalledWith('Socket error');

    unmount();
    expect(socket.emit).toHaveBeenCalledWith('leave_pod', 'p1');
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('does not connect when there is no token', async () => {
    mockToken.mockResolvedValue(null);
    const { unmount } = renderHook(() => usePodSocket({ podId: 'p1', ...callbacks() }));
    await waitFor(() => expect(mockToken).toHaveBeenCalled());
    expect(mockIo).not.toHaveBeenCalled();
    unmount();
  });

  it('ignores a token that resolves after unmount', async () => {
    let resolve: (value: string) => void = () => undefined;
    mockToken.mockReturnValue(
      new Promise<string>((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderHook(() => usePodSocket({ podId: 'p1', ...callbacks() }));
    unmount();
    await act(async () => {
      resolve('jwt');
    });
    expect(mockIo).not.toHaveBeenCalled();
  });
});
