import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { useAsyncClick } from '../src/useAsyncClick';

afterEach(cleanup);

const click = {} as MouseEvent<never>;

/** A promise whose settlement the test decides. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAsyncClick', () => {
  it('hands back no wrapper and no loading state when there is no handler', () => {
    const { result } = renderHook(() => useAsyncClick(undefined, undefined));
    expect(result.current.onClick).toBeUndefined();
    expect(result.current.loading).toBeUndefined();
  });

  it('leaves a synchronous handler alone: it runs, and nothing spins', () => {
    const seen: unknown[] = [];
    const { result } = renderHook(() =>
      useAsyncClick((event) => {
        seen.push(event);
      }, undefined),
    );
    act(() => result.current.onClick?.(click));
    expect(seen).toEqual([click]);
    expect(result.current.loading).toBeUndefined();
  });

  it('treats a non-thenable return value as synchronous too', () => {
    const { result } = renderHook(() => useAsyncClick(() => ({ ok: true }), undefined));
    act(() => result.current.onClick?.(click));
    expect(result.current.loading).toBeUndefined();
  });

  it('spins while a returned promise is in flight and rests once it resolves', async () => {
    const pending = deferred<string>();
    const { result } = renderHook(() => useAsyncClick(() => pending.promise, undefined));
    act(() => result.current.onClick?.(click));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      pending.resolve('saved');
      await pending.promise;
    });
    expect(result.current.loading).toBeUndefined();
  });

  it('rests on rejection as well — failure is the caller’s to report, not the button’s', async () => {
    const pending = deferred<never>();
    const { result } = renderHook(() => useAsyncClick(() => pending.promise, undefined));
    act(() => result.current.onClick?.(click));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      pending.reject(new Error('GraphQL error: Pod DUN-POD-4821 is full'));
      await pending.promise.catch(() => undefined);
    });
    expect(result.current.loading).toBeUndefined();
  });

  it('does not touch state when the promise settles after the button unmounted', async () => {
    const pending = deferred<void>();
    const { result, unmount } = renderHook(() => useAsyncClick(() => pending.promise, undefined));
    act(() => result.current.onClick?.(click));
    unmount();
    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    // The last rendered value is what the unmounted hook still reports.
    expect(result.current.loading).toBe(true);
  });

  it('lets an explicit loading prop win over the promise-driven state', () => {
    const { result } = renderHook(() => useAsyncClick(() => Promise.resolve(), false));
    act(() => result.current.onClick?.(click));
    expect(result.current.loading).toBe(false);
  });
});
