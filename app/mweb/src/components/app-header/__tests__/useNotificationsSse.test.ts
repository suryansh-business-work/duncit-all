import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNotificationsSse } from '../useNotificationsSse';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static throwOnConstruct = false;

  url: string;
  options: unknown;
  closed = false;
  onerror: (() => void) | null = null;
  listeners: Record<string, Array<() => void>> = {};

  constructor(url: string, options?: unknown) {
    if (FakeEventSource.throwOnConstruct) {
      throw new Error('boom');
    }
    this.url = url;
    this.options = options;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: () => void) {
    (this.listeners[type] ||= []).push(handler);
  }

  removeEventListener(type: string, handler: () => void) {
    this.listeners[type] = (this.listeners[type] || []).filter((h) => h !== handler);
  }

  close() {
    this.closed = true;
  }

  emit(type: string) {
    (this.listeners[type] || []).forEach((h) => h());
  }
}

describe('useNotificationsSse', () => {
  const OriginalEventSource = globalThis.EventSource;

  beforeEach(() => {
    FakeEventSource.instances = [];
    FakeEventSource.throwOnConstruct = false;
    (globalThis as unknown as { EventSource: unknown }).EventSource = FakeEventSource;
    localStorage.clear();
  });

  afterEach(() => {
    (globalThis as unknown as { EventSource: unknown }).EventSource = OriginalEventSource;
    localStorage.clear();
  });

  it('does not open a connection when no token is present', () => {
    const onEvent = vi.fn();
    renderHook(() => useNotificationsSse(onEvent));

    expect(FakeEventSource.instances).toHaveLength(0);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('opens an EventSource with the token-encoded stream url when a token exists', () => {
    localStorage.setItem('token', 'abc 123');
    const onEvent = vi.fn();
    renderHook(() => useNotificationsSse(onEvent));

    expect(FakeEventSource.instances).toHaveLength(1);
    const es = FakeEventSource.instances[0];
    expect(es.url).toContain('/notifications/stream?token=');
    expect(es.url).toContain(encodeURIComponent('abc 123'));
    expect(es.options).toEqual({ withCredentials: false });
  });

  it('invokes onEvent when a notify or hello event fires', () => {
    localStorage.setItem('token', 'tok');
    const onEvent = vi.fn();
    renderHook(() => useNotificationsSse(onEvent));

    const es = FakeEventSource.instances[0];
    es.emit('notify');
    es.emit('hello');

    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it('always calls the latest onEvent via the ref', () => {
    localStorage.setItem('token', 'tok');
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useNotificationsSse(cb), {
      initialProps: { cb: first },
    });

    rerender({ cb: second });

    const es = FakeEventSource.instances[0];
    es.emit('notify');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('exposes a no-op onerror handler that does not throw', () => {
    localStorage.setItem('token', 'tok');
    renderHook(() => useNotificationsSse(vi.fn()));

    const es = FakeEventSource.instances[0];
    expect(() => es.onerror?.()).not.toThrow();
  });

  it('removes listeners and closes the source on unmount', () => {
    localStorage.setItem('token', 'tok');
    const onEvent = vi.fn();
    const { unmount } = renderHook(() => useNotificationsSse(onEvent));

    const es = FakeEventSource.instances[0];
    unmount();

    expect(es.closed).toBe(true);
    es.emit('notify');
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('swallows an EventSource constructor error without throwing', () => {
    localStorage.setItem('token', 'tok');
    FakeEventSource.throwOnConstruct = true;

    expect(() => renderHook(() => useNotificationsSse(vi.fn()))).not.toThrow();
    expect(FakeEventSource.instances).toHaveLength(0);
  });
});
