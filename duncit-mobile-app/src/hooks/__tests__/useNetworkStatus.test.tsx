import { act, renderHook } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

type Listener = (state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}) => void;

const addListener = NetInfo.addEventListener as unknown as jest.Mock;

beforeEach(() => addListener.mockReset());

function renderWithListener() {
  let listener: Listener = () => undefined;
  const unsubscribe = jest.fn();
  addListener.mockImplementation((cb: Listener) => {
    listener = cb;
    return unsubscribe;
  });
  const hook = renderHook(() => useNetworkStatus());
  return { hook, emit: (s: Parameters<Listener>[0]) => act(() => listener(s)), unsubscribe };
}

describe('useNetworkStatus', () => {
  it('starts online and flips to offline when disconnected', () => {
    const { hook, emit } = renderWithListener();
    expect(hook.result.current.isOffline).toBe(false);

    emit({ isConnected: false, isInternetReachable: false });
    expect(hook.result.current.isOffline).toBe(true);

    emit({ isConnected: true, isInternetReachable: true });
    expect(hook.result.current.isOffline).toBe(false);
  });

  it('treats unreachable internet as offline and null as online', () => {
    const { hook, emit } = renderWithListener();
    emit({ isConnected: true, isInternetReachable: false });
    expect(hook.result.current.isOffline).toBe(true);

    emit({ isConnected: true, isInternetReachable: null });
    expect(hook.result.current.isOffline).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const { hook, unsubscribe } = renderWithListener();
    hook.unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
