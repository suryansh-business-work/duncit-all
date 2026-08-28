/**
 * The two facts the chrome needs that only the portal's boot knows — a
 * context rather than props threaded through every layer of chrome.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readToken, useShellRuntime, ShellRuntimeProvider } from '../src/lib/runtime';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useShellRuntime', () => {
  it('is null outside a portal boot', () => {
    const { result } = renderHook(() => useShellRuntime());
    expect(result.current).toBeNull();
  });

  it('carries the graphqlUrl and tokenKey inside the provider', () => {
    const { result } = renderHook(() => useShellRuntime(), {
      wrapper: ({ children }) => (
        <ShellRuntimeProvider graphqlUrl="https://api.test/graphql" tokenKey="tok_key">
          {children}
        </ShellRuntimeProvider>
      ),
    });
    expect(result.current).toEqual({ graphqlUrl: 'https://api.test/graphql', tokenKey: 'tok_key' });
  });
});

describe('readToken', () => {
  it('is null with no runtime at all', () => {
    expect(readToken(null)).toBeNull();
  });

  it("reads the portal's own token key from localStorage", () => {
    localStorage.setItem('tok_key', 'jwt');
    expect(readToken({ graphqlUrl: 'https://api.test/graphql', tokenKey: 'tok_key' })).toBe('jwt');
    localStorage.removeItem('tok_key');
  });

  it('answers null rather than throwing when localStorage itself is unavailable', () => {
    const original = globalThis.localStorage.getItem;
    globalThis.localStorage.getItem = () => {
      throw new Error('storage is disabled');
    };

    try {
      expect(readToken({ graphqlUrl: 'https://api.test/graphql', tokenKey: 'tok_key' })).toBeNull();
    } finally {
      globalThis.localStorage.getItem = original;
    }
  });
});
