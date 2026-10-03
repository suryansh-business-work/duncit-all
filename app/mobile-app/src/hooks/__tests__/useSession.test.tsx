import { act, renderHook, waitFor } from '@testing-library/react-native';
import { io } from 'socket.io-client';
import { subscribeSessionRevoked, subscribeUserChanged } from '@duncit/user-core';

import { getAuthToken } from '@/services/auth-token';
import { readDevice } from '@/services/device';
import { endRejectedSession } from '@/services/session-guard';
import { useFeatureFlagsStore } from '@/stores/feature-flags.store';
import { patchMe, useMeStore } from '@/stores/me.store';
import { useSession } from '@/hooks/useSession';

jest.mock('@/constants/config', () => ({ config: { apiUrl: 'https://api.example.test' } }));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/auth-token', () => ({ getAuthToken: jest.fn() }));
jest.mock('@/services/device', () => ({ readDevice: jest.fn() }));
jest.mock('@/services/session-guard', () => ({ endRejectedSession: jest.fn() }));
jest.mock('socket.io-client', () => ({ io: jest.fn() }));
jest.mock('@duncit/user-core', () => ({
  ...jest.requireActual('@duncit/user-core'),
  subscribeUserChanged: jest.fn(),
  subscribeSessionRevoked: jest.fn(),
}));

const mockToken = getAuthToken as jest.Mock;
const mockReadDevice = readDevice as jest.Mock;
const mockIo = io as unknown as jest.Mock;
const mockSubChanged = subscribeUserChanged as jest.Mock;
const mockSubRevoked = subscribeSessionRevoked as jest.Mock;

const phone = {
  duid: 'duid-1',
  platform: 'ios',
  os: '18',
  model: 'iPhone',
  app_version: '1.0.0',
  timezone: 'Asia/Kolkata',
};

const me = {
  user_id: 'u1',
  first_name: 'Asha',
  last_name: 'Rao',
  email: 'asha@example.com',
  roles: ['HOST', 'USER'],
};

type MeShape = NonNullable<NonNullable<ReturnType<typeof useMeStore.getState>['data']>['me']>;

function setMe(state: { me?: unknown; isLoading?: boolean; error?: unknown }) {
  useMeStore.setState({
    data: state.me === undefined ? undefined : { me: state.me as MeShape },
    isLoading: state.isLoading ?? false,
    error: state.error,
  });
}

let socket: { disconnect: jest.Mock };
let offChanged: jest.Mock;
let offRevoked: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  socket = { disconnect: jest.fn() };
  mockIo.mockReturnValue(socket);
  offChanged = jest.fn();
  offRevoked = jest.fn();
  mockSubChanged.mockReturnValue(offChanged);
  mockSubRevoked.mockReturnValue(offRevoked);
  mockToken.mockResolvedValue(null);
  setMe({});
  useFeatureFlagsStore.setState({ data: undefined, isLoading: false, error: undefined });
});

describe('useSession — device', () => {
  it('reads the device once, and only live hooks take it', async () => {
    let resolve: (d: typeof phone) => void = () => undefined;
    mockReadDevice.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const first = renderHook(() => useSession());
    const second = renderHook(() => useSession());
    expect(first.result.current.device.platform).toBe('unknown');
    first.unmount();

    await act(async () => resolve(phone));
    expect(second.result.current.device).toEqual(phone);
    expect(mockReadDevice).toHaveBeenCalledTimes(1);
  });

  it('starts from the cached device without reading again', () => {
    const { result } = renderHook(() => useSession());
    expect(result.current.device).toEqual(phone);
    expect(mockReadDevice).not.toHaveBeenCalled();
  });
});

describe('useSession — status and derivations', () => {
  it('is anonymous with nothing loaded', () => {
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('anonymous');
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.roles).toEqual([]);
    expect(result.current.name).toBe('User');
    expect(result.current.initials).toBe('U');
    expect(result.current.email).toBe('');
    expect(result.current.flags).toEqual({});
  });

  it('is loading while the user request is out', () => {
    setMe({ isLoading: true });
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('loading');
  });

  it('is failed when the user request errored', () => {
    setMe({ error: new Error('down') });
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('failed');
  });

  it('derives the signed-in user, roles and flags', () => {
    setMe({ me });
    useFeatureFlagsStore.setState({
      data: {
        publicFeatureFlags: [
          { key: 'shop', enabled: true },
          { key: 'reels', enabled: false },
          { key: 'beta', enabled: null },
        ],
      } as never,
    });
    const { result } = renderHook(() => useSession());
    const s = result.current;
    expect(s.status).toBe('authenticated');
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.user_id).toBe('u1');
    expect(s.name).toBe('Asha Rao');
    expect(s.initials).toBe('AR');
    expect(s.email).toBe('asha@example.com');
    expect(s.flags).toEqual({ shop: true, reels: false, beta: false });
    expect(s.hasFlag('shop')).toBe(true);
    expect(s.hasFlag('reels')).toBe(false);
    expect(s.hasFlag('missing')).toBe(false);
    expect(s.can('HOST', 'USER')).toBe(true);
    expect(s.can('HOST', 'ADMIN')).toBe(false);
    expect(s.canAny('ADMIN', 'HOST')).toBe(true);
    expect(s.canAny('ADMIN')).toBe(false);
  });

  it('treats a user without an id as signed out', () => {
    setMe({ me: { first_name: 'Ghost' } });
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('anonymous');
    expect(mockToken).not.toHaveBeenCalled();
  });
});

describe('useSession — realtime', () => {
  it('opens no socket while signed out', () => {
    renderHook(() => useSession());
    expect(mockToken).not.toHaveBeenCalled();
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('subscribes to account changes and revocation with the token, and closes on unmount', async () => {
    mockToken.mockResolvedValue('tok-1');
    setMe({ me });
    const { unmount } = renderHook(() => useSession());
    await waitFor(() => expect(mockIo).toHaveBeenCalledTimes(1));

    expect(mockIo).toHaveBeenCalledWith('https://api.example.test', {
      path: '/socket.io',
      auth: { token: 'tok-1' },
      transports: ['websocket', 'polling'],
    });
    expect(mockSubChanged).toHaveBeenCalledWith(socket, 'u1', patchMe);
    expect(mockSubRevoked).toHaveBeenCalledWith(socket, 'u1', endRejectedSession);

    unmount();
    expect(offChanged).toHaveBeenCalledTimes(1);
    expect(offRevoked).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('opens no socket when there is no stored token', async () => {
    mockToken.mockResolvedValue(null);
    setMe({ me });
    renderHook(() => useSession());
    await waitFor(() => expect(mockToken).toHaveBeenCalledTimes(1));
    await act(async () => Promise.resolve());
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('opens no socket when the hook unmounts before the token arrives', async () => {
    let resolve: (t: string) => void = () => undefined;
    mockToken.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    setMe({ me });
    const { unmount } = renderHook(() => useSession());
    unmount();
    await act(async () => resolve('tok-late'));
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('stays quiet when reading the token fails', async () => {
    mockToken.mockRejectedValueOnce(new Error('keychain locked'));
    setMe({ me });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(mockToken).toHaveBeenCalledTimes(1));
    await act(async () => Promise.resolve());
    expect(mockIo).not.toHaveBeenCalled();
    expect(result.current.status).toBe('authenticated');
  });
});
