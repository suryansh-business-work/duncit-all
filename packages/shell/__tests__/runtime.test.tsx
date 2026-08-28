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
    // jsdom's `localStorage` is Proxy-backed — overriding just `.getItem` on
    // the instance is silently ignored, so the global binding itself has to
    // be swapped out to force a genuine throw.
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error('storage is disabled');
        },
      },
    });

    try {
      expect(readToken({ graphqlUrl: 'https://api.test/graphql', tokenKey: 'tok_key' })).toBeNull();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });
});
