import { act, renderHook } from '@testing-library/react-native';
import { CART_CONTROL_NOTICE_MS } from '@duncit/utils';

import { useCartControlNotice } from '@/hooks/useCartControlNotice';

interface HookProps {
  quantity: number;
  armed?: boolean;
}

const mount = (initialProps: HookProps) =>
  renderHook(({ quantity, armed }: HookProps) => useCartControlNotice(quantity, armed), {
    initialProps,
  });

describe('useCartControlNotice', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('says nothing on first mount, even for a product already in the cart', () => {
    expect(mount({ quantity: 0 }).result.current).toBeNull();
    expect(mount({ quantity: 3 }).result.current).toBeNull();
  });

  it('raises "added" for the first unit and clears it after the notice time', () => {
    const { result, rerender } = mount({ quantity: 0 });

    rerender({ quantity: 1 });
    expect(result.current).toBe('added');

    act(() => {
      jest.advanceTimersByTime(CART_CONTROL_NOTICE_MS - 1);
    });
    expect(result.current).toBe('added');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBeNull();
  });

  it('raises "removed" when the last unit comes out', () => {
    const { result, rerender } = mount({ quantity: 1 });

    rerender({ quantity: 0 });
    expect(result.current).toBe('removed');

    act(() => {
      jest.advanceTimersByTime(CART_CONTROL_NOTICE_MS);
    });
    expect(result.current).toBeNull();
  });

  it('stays quiet for a step between two quantities that are both in the cart', () => {
    const { result, rerender } = mount({ quantity: 1 });

    rerender({ quantity: 2 });
    rerender({ quantity: 3 });
    rerender({ quantity: 2 });
    expect(result.current).toBeNull();
  });

  it('replaces a notice still showing and gives the new one its full time', () => {
    const { result, rerender } = mount({ quantity: 0 });

    rerender({ quantity: 1 });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    rerender({ quantity: 0 });
    expect(result.current).toBe('removed');

    // The first notice's timer must not cut the second one short.
    act(() => {
      jest.advanceTimersByTime(CART_CONTROL_NOTICE_MS - 1);
    });
    expect(result.current).toBe('removed');
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBeNull();
  });

  it('does not take the saved cart arriving for an add', () => {
    const { result, rerender } = mount({ quantity: 0, armed: false });

    // The stored units and "ready" land in the same render.
    rerender({ quantity: 2, armed: true });
    expect(result.current).toBeNull();

    // From here on the member's own changes count.
    rerender({ quantity: 0, armed: true });
    expect(result.current).toBe('removed');
  });

  it('leaves no timer behind when the card unmounts mid-notice', () => {
    const { rerender, unmount } = mount({ quantity: 0 });

    rerender({ quantity: 1 });
    expect(jest.getTimerCount()).toBe(1);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
