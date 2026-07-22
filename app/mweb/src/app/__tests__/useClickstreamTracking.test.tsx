import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Capture the mutation function the hook receives from useMutation.
const recordSpy = vi.fn(() => Promise.resolve());

vi.mock('@apollo/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client')>();
  return { ...actual, useMutation: () => [recordSpy, {}] };
});

// jsdom has no IntersectionObserver — provide a controllable stub.
type IOEntry = { target: Element; isIntersecting: boolean };
let ioCallback: ((entries: IOEntry[]) => void) | null = null;
const ioObserve = vi.fn();
const ioDisconnect = vi.fn();

class MockIntersectionObserver {
  constructor(cb: (entries: IOEntry[]) => void) {
    ioCallback = cb;
  }
  observe = ioObserve;
  disconnect = ioDisconnect;
  unobserve = vi.fn();
  takeRecords = () => [];
}

import { useClickstreamTracking } from '../useClickstreamTracking';

const render = (args: { enabled: boolean; path?: string; superCategory?: string }) =>
  renderHook(() =>
    useClickstreamTracking({
      enabled: args.enabled,
      path: args.path ?? '/home',
      superCategory: args.superCategory ?? 'events',
    }),
  );

const lastInput = () => recordSpy.mock.calls.at(-1)?.[0].variables.input;
const eventTypes = () => recordSpy.mock.calls.map((c) => c[0].variables.input.event_type);

beforeEach(() => {
  recordSpy.mockClear();
  ioObserve.mockClear();
  ioDisconnect.mockClear();
  ioCallback = null;
  localStorage.clear();
  document.body.innerHTML = '';
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockIntersectionObserver;
});

afterEach(() => {
  localStorage.clear();
});

describe('useClickstreamTracking', () => {
  it('does nothing when disabled', () => {
    localStorage.setItem('token', 't');
    render({ enabled: false });
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('does not send when there is no auth token even if enabled', () => {
    render({ enabled: true });
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('fires one PAGE_VIEW on mount with the expected payload', () => {
    localStorage.setItem('token', 't');
    render({ enabled: true, path: '/deals', superCategory: 'shopping' });

    expect(eventTypes()).toContain('PAGE_VIEW');
    const input = recordSpy.mock.calls[0][0].variables.input;
    expect(input.event_type).toBe('PAGE_VIEW');
    expect(input.path).toBe('/deals');
    expect(input.super_category_slug).toBe('shopping');
    expect(typeof input.client_event_id).toBe('string');
    expect(typeof input.occurred_at).toBe('string');
    // metadata_json carries viewport + our extra source flag
    const meta = JSON.parse(input.metadata_json);
    expect(meta.source).toBe('route_change');
    expect(meta.viewport).toMatch(/^\d+x\d+$/);
  });

  it('nulls the super_category_slug when empty', () => {
    localStorage.setItem('token', 't');
    render({ enabled: true, superCategory: '' });
    expect(recordSpy.mock.calls[0][0].variables.input.super_category_slug).toBeNull();
  });

  it('sends CLICK for interactive controls and describes the target', () => {
    localStorage.setItem('token', 't');
    const anchor = document.createElement('a');
    anchor.href = 'https://example.com/x';
    anchor.setAttribute('aria-label', 'Go X');
    anchor.setAttribute('role', 'button');
    anchor.textContent = '  Buy   now  ';
    document.body.appendChild(anchor);

    render({ enabled: true });
    recordSpy.mockClear();

    act(() => {
      anchor.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(eventTypes()).toContain('CLICK');
    const input = lastInput();
    expect(input.target_tag).toBe('a');
    expect(input.target_text).toBe('Buy now');
    expect(input.target_label).toBe('Go X');
    expect(input.target_role).toBe('button');
    expect(input.target_href).toBe('https://example.com/x');
    expect(JSON.parse(input.metadata_json).pointer).toBe('mouse');
  });

  it('ignores clicks on non-interactive areas', () => {
    localStorage.setItem('token', 't');
    const div = document.createElement('div');
    div.textContent = 'plain';
    document.body.appendChild(div);

    render({ enabled: true });
    recordSpy.mockClear();

    act(() => {
      div.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('removes the click listener on unmount', () => {
    localStorage.setItem('token', 't');
    const button = document.createElement('button');
    document.body.appendChild(button);
    const { unmount } = render({ enabled: true });
    unmount();
    recordSpy.mockClear();

    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('observes and reports IMPRESSION once per element when it becomes visible', () => {
    localStorage.setItem('token', 't');
    const el = document.createElement('div');
    el.setAttribute('data-track-impression', 'card-1');
    document.body.appendChild(el);

    render({ enabled: true });
    recordSpy.mockClear();
    expect(ioObserve).toHaveBeenCalled();
    expect(ioCallback).not.toBeNull();

    act(() => {
      ioCallback?.([{ target: el, isIntersecting: true }]);
    });
    expect(eventTypes()).toContain('IMPRESSION');
    expect(JSON.parse(lastInput().metadata_json).source).toBe('element_visible');

    // Not-intersecting and repeat-of-seen entries are ignored.
    recordSpy.mockClear();
    act(() => {
      ioCallback?.([
        { target: el, isIntersecting: true },
        { target: el, isIntersecting: false },
      ]);
    });
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('skips the impression observer when no opted-in elements exist', () => {
    localStorage.setItem('token', 't');
    render({ enabled: true });
    expect(ioObserve).not.toHaveBeenCalled();
  });

  it('disconnects the observer on unmount', () => {
    localStorage.setItem('token', 't');
    const el = document.createElement('div');
    el.setAttribute('data-track-impression', 'c');
    document.body.appendChild(el);
    const { unmount } = render({ enabled: true });
    unmount();
    expect(ioDisconnect).toHaveBeenCalled();
  });

  it('does not set up the observer when IntersectionObserver is unavailable', () => {
    localStorage.setItem('token', 't');
    (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver = undefined;
    const el = document.createElement('div');
    el.setAttribute('data-track-impression', 'c');
    document.body.appendChild(el);
    render({ enabled: true });
    expect(ioObserve).not.toHaveBeenCalled();
  });
});
