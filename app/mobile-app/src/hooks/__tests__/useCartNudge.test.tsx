import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useCartNudge } from '@/hooks/useCartNudge';
import { graphqlRequest } from '@/services/graphql.client';
import { getItem, setItem } from '@/services/secure-storage';
import { useCartStore, type CartLine } from '@/stores/cart.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/secure-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const mockGet = getItem as jest.Mock;
const mockSet = setItem as jest.Mock;

const line = { pod_id: 'p1', product_id: 'a', variant_id: '', quantity: 2 } as CartLine;
const settings = { nudge_enabled: true, nudge_delay_minutes: 1, nudge_auto_hide_seconds: 5 };

/** Mounts with settings loaded, then lets the one-minute delay elapse. */
async function mountDue(route = 'Home') {
  const hook = renderHook(() => useCartNudge(route));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(60_000);
  });
  return hook;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockRequest.mockReset().mockResolvedValue({ productCartSettings: settings });
  mockGet.mockReset().mockResolvedValue(null);
  mockSet.mockReset().mockResolvedValue(undefined);
  useCartStore.setState({ lines: [line] });
});

afterEach(() => jest.useRealTimers());

describe('useCartNudge', () => {
  it('stays closed until the configured delay has passed, then opens', async () => {
    const { result } = renderHook(() => useCartNudge('Home'));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });
    expect(result.current.open).toBe(false);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });
    expect(result.current.open).toBe(true);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.hideMs).toBe(5000);
  });

  it('never opens on the cart route or with an empty cart', async () => {
    const onCart = await mountDue('Cart');
    expect(onCart.result.current.open).toBe(false);
    onCart.unmount();

    useCartStore.setState({ lines: [] });
    const empty = await mountDue('Home');
    expect(empty.result.current.open).toBe(false);
  });

  it('hide closes it and it comes due again after another delay', async () => {
    const { result } = await mountDue();
    expect(result.current.open).toBe(true);
    act(() => result.current.hide());
    expect(result.current.open).toBe(false);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60_000);
    });
    expect(result.current.open).toBe(true);
  });

  it('mute persists the device flag and keeps it closed', async () => {
    const { result } = await mountDue();
    act(() => result.current.mute());
    expect(result.current.open).toBe(false);
    expect(mockSet).toHaveBeenCalledWith('duncit.cart_nudge_muted', '1');
    await act(async () => {
      await jest.advanceTimersByTimeAsync(120_000);
    });
    expect(result.current.open).toBe(false);
  });

  it('stays closed when the device flag says muted', async () => {
    mockGet.mockResolvedValue('1');
    const { result } = await mountDue();
    expect(result.current.open).toBe(false);
  });

  it('falls back to the default delay when settings cannot load, and unmutes on a failed flag read', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    mockGet.mockRejectedValue(new Error('keychain'));
    const { result } = await mountDue();
    // Default is 10 minutes, so it is not due after one.
    expect(result.current.open).toBe(false);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(9 * 60_000);
    });
    await waitFor(() => expect(result.current.open).toBe(true));
  });

  it('survives a failed flag write', async () => {
    mockSet.mockRejectedValue(new Error('disk'));
    const { result } = await mountDue();
    act(() => result.current.mute());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(result.current.open).toBe(false);
  });

  it('later snoozes it for the rest of the launch (kept last: module state)', async () => {
    const { result, unmount } = await mountDue();
    act(() => result.current.later());
    expect(result.current.open).toBe(false);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(120_000);
    });
    expect(result.current.open).toBe(false);
    unmount();
    const again = await mountDue();
    expect(again.result.current.open).toBe(false);
  });
});
