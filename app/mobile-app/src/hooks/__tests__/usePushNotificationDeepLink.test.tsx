import { renderHook } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';

import {
  navigateForPushLink,
  usePushNotificationDeepLink,
} from '@/hooks/usePushNotificationDeepLink';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockAddListener = jest.fn();
const mockGetLast = jest.fn();
const mockRemove = jest.fn();
jest.mock('expo-notifications', () => ({
  __esModule: true,
  addNotificationResponseReceivedListener: (...args: unknown[]) => mockAddListener(...args),
  getLastNotificationResponseAsync: (...args: unknown[]) => mockGetLast(...args),
}));

const response = (link: unknown) => ({
  notification: { request: { content: { data: { link } } } },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLast.mockResolvedValue(null);
  mockAddListener.mockReturnValue({ remove: mockRemove });
});

describe('navigateForPushLink', () => {
  const nav = { navigate: mockNavigate } as never;

  it('deep-links a post link to PostDetail', () => {
    navigateForPushLink(nav, '/post/p9');
    expect(mockNavigate).toHaveBeenCalledWith('PostDetail', { postId: 'p9' });
  });

  it('opens an external link', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    navigateForPushLink(nav, 'https://x.com');
    expect(openURL).toHaveBeenCalledWith('https://x.com');
  });

  it('navigates to a known param-less screen', () => {
    navigateForPushLink(nav, '/earn');
    expect(mockNavigate).toHaveBeenCalledWith('Earn');
  });

  it('does nothing for an unknown or non-string link', () => {
    navigateForPushLink(nav, '/unknown');
    navigateForPushLink(nav, 42);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('usePushNotificationDeepLink', () => {
  it('registers a tap listener and deep-links taps + cold-start responses', async () => {
    mockGetLast.mockResolvedValue(response('/post/cold'));
    const { unmount } = renderHook(() => usePushNotificationDeepLink());

    // Cold-start response routed once resolved.
    await Promise.resolve();
    await Promise.resolve();
    expect(mockNavigate).toHaveBeenCalledWith('PostDetail', { postId: 'cold' });

    // A live tap routes via the registered handler.
    const handler = mockAddListener.mock.calls[0][0] as (r: unknown) => void;
    handler(response('/post/live'));
    expect(mockNavigate).toHaveBeenCalledWith('PostDetail', { postId: 'live' });

    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('ignores a cold start with no pending response', async () => {
    mockGetLast.mockResolvedValue(null);
    renderHook(() => usePushNotificationDeepLink());
    await Promise.resolve();
    await Promise.resolve();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('swallows a cold-start lookup failure', async () => {
    mockGetLast.mockRejectedValue(new Error('boom'));
    renderHook(() => usePushNotificationDeepLink());
    await Promise.resolve();
    await Promise.resolve();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('is a no-op on the web target', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      renderHook(() => usePushNotificationDeepLink());
      expect(mockAddListener).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
    }
  });

  it('degrades silently when the native module throws on access', () => {
    mockAddListener.mockImplementation(() => {
      throw new Error('no native module');
    });
    expect(() => renderHook(() => usePushNotificationDeepLink())).not.toThrow();
  });
});
