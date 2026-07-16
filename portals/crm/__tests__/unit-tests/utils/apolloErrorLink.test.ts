import { describe, expect, it, vi } from 'vitest';
import { apolloErrorLink } from '@duncit/shell';
import { Observable } from '@apollo/client';

/**
 * `onError` returns an ApolloLink. We can drive its `request` method with a
 * stub forward to assert the link rewrites the `networkError.message` for
 * recognised network failures (the only behaviour the link adds).
 */

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('apolloErrorLink', () => {
  const drive = (networkError: Error | null) =>
    new Promise<Error | null>((resolve) => {
      const forward = () =>
        new Observable<any>((sub) => {
          // Emit an Apollo response with a networkError attached. The
          // `onError` callback the link wraps inspects errors thrown from
          // observable.error(); we use sub.error to trigger it.
          if (networkError) sub.error(networkError);
          else sub.complete();
        });
      apolloErrorLink
        .request({ query: {} as any, operationName: 'X', variables: {}, extensions: {} } as any, forward)!
        .subscribe({
          error: (e) => resolve(e ?? null),
          complete: () => resolve(null),
        });
    });

  it('rewrites a "Failed to fetch" message to the friendly connectivity copy', async () => {
    const original = new Error('Failed to fetch');
    const observed = await drive(original);
    await flush();
    expect(observed?.message).toMatch(/unable to connect/i);
  });

  it('rewrites a "Load failed" message (Safari) too', async () => {
    const original = new Error('Load failed');
    const observed = await drive(original);
    await flush();
    expect(observed?.message).toMatch(/unable to connect/i);
  });

  it('leaves unrelated network error messages untouched', async () => {
    const original = new Error('500 server error');
    const observed = await drive(original);
    await flush();
    expect(observed?.message).toBe('500 server error');
  });

  it('does nothing when there is no networkError', async () => {
    const result = await drive(null);
    expect(result).toBeNull();
    // Silence unused warning — the spy isn't strictly needed but the test
    // demonstrates the no-op path.
    vi.fn();
  });
});
