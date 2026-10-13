import { act, renderHook, waitFor } from '@testing-library/react-native';
import { io } from 'socket.io-client';

import { usePodChallengeLive } from '@/hooks/usePodChallengeLive';
import { getAuthToken } from '@/services/auth-token';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/auth-token', () => ({ getAuthToken: jest.fn() }));
jest.mock('socket.io-client', () => ({ io: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const mockToken = getAuthToken as jest.Mock;
const mockIo = io as unknown as jest.Mock;

type Handler = (payload?: unknown) => void;
let handlers: Record<string, Handler>;
const fire = (event: string, payload?: unknown) => {
  const handler = handlers[event];
  if (!handler) throw new Error(`no handler for ${event}`);
  handler(payload);
};
let socket: {
  connected: boolean;
  on: jest.Mock;
  off: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
};

const running = { id: 'ch-1', status: 'LIVE', revision: 2 };

beforeEach(() => {
  mockRequest.mockReset();
  mockToken.mockReset();
  handlers = {};
  socket = {
    connected: false,
    on: jest.fn((event: string, h: Handler) => {
      handlers[event] = h;
    }),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  mockIo.mockReset().mockReturnValue(socket);
});

afterEach(() => jest.useRealTimers());

describe('usePodChallengeLive', () => {
  it('does nothing without a challenge id', async () => {
    mockToken.mockResolvedValue('tok');
    const { result } = renderHook(() => usePodChallengeLive(''));
    expect(result.current.challenge).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('loads the challenge and records when it arrived', async () => {
    mockToken.mockResolvedValue(null);
    mockRequest.mockResolvedValue({ podChallenge: running });
    const { result } = renderHook(() => usePodChallengeLive('ch-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.challenge).toEqual(running);
    expect(result.current.error).toBe('');
    expect(mockRequest.mock.calls[0][1]).toEqual({ id: 'ch-1' });
    expect(mockRequest.mock.calls[0][2]).toEqual({ auth: true });
    // No session token, so no socket is opened.
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('clears the challenge when the server has none', async () => {
    mockToken.mockResolvedValue(null);
    mockRequest.mockResolvedValue({ podChallenge: null });
    const { result } = renderHook(() => usePodChallengeLive('ch-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.challenge).toBeNull();
  });

  it('reports a load failure as the error', async () => {
    mockToken.mockResolvedValue(null);
    mockRequest.mockRejectedValue(new Error('Challenge not visible'));
    const { result } = renderHook(() => usePodChallengeLive('ch-1'));
    await waitFor(() => expect(result.current.error).toBe('Challenge not visible'));
    expect(result.current.isLoading).toBe(false);
  });

  it('adopt applies a mutation answer and ignores an empty one', async () => {
    mockToken.mockResolvedValue(null);
    mockRequest.mockResolvedValue({ podChallenge: running });
    const { result } = renderHook(() => usePodChallengeLive('ch-1'));
    await waitFor(() => expect(result.current.challenge).not.toBeNull());
    act(() => result.current.adopt({ ...running, revision: 3, status: 'PAUSED' } as never));
    expect(result.current.challenge).toMatchObject({ revision: 3, status: 'PAUSED' });
    act(() => result.current.adopt(null));
    expect(result.current.challenge).toMatchObject({ revision: 3 });
  });

  it('connects with the token, goes live and re-reads on a newer revision only', async () => {
    mockToken.mockResolvedValue('tok');
    mockRequest.mockResolvedValue({ podChallenge: running });
    const { result, unmount } = renderHook(() => usePodChallengeLive('ch-1'));
    await waitFor(() => expect(mockIo).toHaveBeenCalled());
    expect(mockIo.mock.calls[0][1]).toMatchObject({ auth: { token: 'tok' }, path: '/socket.io' });
    await waitFor(() => expect(result.current.challenge).not.toBeNull());
    mockRequest.mockClear();

    act(() => fire('connect'));
    expect(socket.emit).toHaveBeenCalledWith('join_challenge', 'ch-1');
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    mockRequest.mockClear();

    act(() => fire('challenge:changed', { challengeId: 'ch-1', revision: 2, kind: 'x' }));
    act(() => fire('challenge:changed', { challengeId: 'other', revision: 9, kind: 'x' }));
    expect(mockRequest).not.toHaveBeenCalled();
    act(() => fire('challenge:changed', { challengeId: 'ch-1', revision: 5, kind: 'x' }));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));

    unmount();
    expect(socket.emit).toHaveBeenCalledWith('leave_challenge', 'ch-1');
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('polls while not live and stops once the challenge is finished', async () => {
    jest.useFakeTimers();
    mockToken.mockResolvedValue(null);
    mockRequest.mockResolvedValue({ podChallenge: running });
    const { result } = renderHook(() => usePodChallengeLive('ch-1'));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(result.current.challenge).toEqual(running);
    mockRequest.mockClear();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);

    mockRequest.mockResolvedValue({
      podChallenge: { ...running, status: 'COMPLETED', revision: 9 },
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
    });
    mockRequest.mockClear();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(20000);
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('does not open a socket when unmounted before the token resolves', async () => {
    let resolve!: (v: string) => void;
    mockToken.mockReturnValue(new Promise((r) => (resolve = r)));
    mockRequest.mockResolvedValue({ podChallenge: running });
    const { unmount } = renderHook(() => usePodChallengeLive('ch-1'));
    unmount();
    await act(async () => {
      resolve('tok');
    });
    expect(mockIo).not.toHaveBeenCalled();
  });
});
