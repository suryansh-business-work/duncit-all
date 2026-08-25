import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApolloProvider } from '@apollo/client';
import { useUsernameCheck } from '../useUsernameCheck';

const query = vi.fn();

vi.mock('@duncit/logs', () => ({ logs: { mWeb: { error: vi.fn() } } }));

const client = { query } as never;
const wrapper = ({ children }: { children: ReactNode }) => (
  <ApolloProvider client={client}>{children}</ApolloProvider>
);

const answer = (username: string, available: boolean, reason: string | null = null) =>
  Promise.resolve({ data: { usernameAvailability: { username, available, reason } } });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  query.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useUsernameCheck', () => {
  it('never leaves the browser for a value whose shape is already decidable', async () => {
    const { result } = renderHook(() => useUsernameCheck('Ravi Plays', 'ravi-9x3m'), { wrapper });
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(query).not.toHaveBeenCalled();
    expect(result.current).toEqual({ checking: false, available: null, reason: null });
  });

  it('never asks about the handle the account already has', async () => {
    renderHook(() => useUsernameCheck('ravi-9x3m', 'ravi-9x3m'), { wrapper });
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(query).not.toHaveBeenCalled();
  });

  it('debounces, then reports the server answer', async () => {
    query.mockReturnValue(answer('ravi-plays', true));
    const { result } = renderHook(() => useUsernameCheck('ravi-plays', 'ravi-9x3m'), { wrapper });

    expect(result.current.checking).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(399));
    expect(query).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));
    await waitFor(() => expect(result.current.available).toBe(true));
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('reports a refusal with the reason the server gave', async () => {
    query.mockReturnValue(answer('admin-x', false, 'RESERVED'));
    const { result } = renderHook(() => useUsernameCheck('admin-x', 'ravi-9x3m'), { wrapper });
    await act(() => vi.advanceTimersByTimeAsync(400));
    await waitFor(() => expect(result.current.reason).toBe('RESERVED'));
    expect(result.current.available).toBe(false);
  });

  it('drops a reply for a value that is no longer in the field', async () => {
    // The slow "taken" for `rav-x` must not overwrite the fast answer for the
    // handle the reader has since typed.
    let resolveStale: (value: unknown) => void = () => undefined;
    query.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStale = resolve;
      }),
    );

    const { result, rerender } = renderHook(({ value }) => useUsernameCheck(value, 'ravi-9x3m'), {
      wrapper,
      initialProps: { value: 'rav-x' },
    });
    await act(() => vi.advanceTimersByTimeAsync(400));

    query.mockReturnValue(answer('ravi-plays', true));
    rerender({ value: 'ravi-plays' });
    await act(() => vi.advanceTimersByTimeAsync(400));
    await waitFor(() => expect(result.current.available).toBe(true));

    resolveStale({ data: { usernameAvailability: { username: 'rav-x', available: false, reason: 'TAKEN' } } });
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(result.current.available).toBe(true);
  });

  it('leaves the field waiting when the check cannot be reached, so Save stays disabled', async () => {
    query.mockImplementation(() => Promise.reject(new Error('offline')));
    const { result } = renderHook(() => useUsernameCheck('ravi-plays', 'ravi-9x3m'), { wrapper });
    await act(() => vi.advanceTimersByTimeAsync(400));
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.available).toBeNull();
  });
});
