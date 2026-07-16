import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_CHANGED_EVENT, emitAuthChanged } from '../src/auth-events';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('auth-events', () => {
  it('exposes the same-tab event name', () => {
    expect(AUTH_CHANGED_EVENT).toBe('duncit:auth-changed');
  });

  it('dispatches the auth-changed event on window', () => {
    const handler = vi.fn();
    globalThis.window.addEventListener(AUTH_CHANGED_EVENT, handler);
    emitAuthChanged();
    expect(handler).toHaveBeenCalledTimes(1);
    globalThis.window.removeEventListener(AUTH_CHANGED_EVENT, handler);
  });

  it('is a no-op when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(() => emitAuthChanged()).not.toThrow();
  });
});
