import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_COOKIE, makeConsent, writeWebConsent } from '@duncit/utils';
import type { ProductEventPayload } from '@duncit/user-core';

// Capture the batches the hook's mutation receives.
const recordSpy = vi.fn((_options: { variables: { events: ProductEventPayload[] } }) => Promise.resolve());

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
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

/** A fresh tracker per test: it is one per tab, so module state must not leak between cases. */
async function mount(path = '/home', superCategory = 'events') {
  vi.resetModules();
  const { useClickstreamTracking } = await import('../useClickstreamTracking');
  const { productTracker } = await import('../productAnalytics');
  const view = renderHook(() => useClickstreamTracking({ path, superCategory }));
  const flush = () => act(async () => productTracker().flush());
  return { ...view, flush };
}

const sent = () => recordSpy.mock.calls.flatMap(([options]) => options.variables.events);
const named = (name: string) => sent().filter((event) => event.event_name === name);

beforeEach(() => {
  recordSpy.mockClear();
  ioObserve.mockClear();
  ioDisconnect.mockClear();
  ioCallback = null;
  localStorage.clear();
  document.body.innerHTML = '';
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
  // These cases describe a visitor who allowed analytics.
  writeWebConsent(makeConsent({ analytics: true, marketing: false }));
});

afterEach(() => {
  // Unmounting stops each tracker's pending flush timer, so no batch lands in the next case.
  cleanup();
  document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`;
});

describe('useClickstreamTracking', () => {
  it('sends nothing without analytics consent', async () => {
    document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`;
    const { flush } = await mount();
    await flush();
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('tracks a visitor who is not signed in, by the device', async () => {
    const { flush } = await mount();
    await flush();
    expect(named('app_open')).toHaveLength(1);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('records the route as a screen, with ids replaced, and the full path and category beside it', async () => {
    const { flush } = await mount('/pods/6650f0c2a1b2c3d4e5f60718?ref=share', 'shopping');
    await flush();
    const [view] = named('screen_view');
    expect(view).toMatchObject({
      screen_name: '/pods/:id',
      path: '/pods/6650f0c2a1b2c3d4e5f60718?ref=share',
      super_category_slug: 'shopping',
      platform: 'mweb',
      previous_screen: '',
    });
    expect(view.session_id).toBe(named('app_open')[0].session_id);
  });

  it('sends a null category when there is none', async () => {
    const { flush } = await mount('/home', '');
    await flush();
    expect(named('screen_view')[0].super_category_slug).toBeNull();
  });

  it('describes a pressed control by its test id, accessible name and role, redacting its text', async () => {
    const anchor = document.createElement('a');
    anchor.href = 'https://example.com/x';
    anchor.setAttribute('aria-label', 'Join pod');
    anchor.setAttribute('role', 'button');
    anchor.dataset.testid = 'pod-join';
    anchor.textContent = '  Pay   1499  ';
    document.body.appendChild(anchor);
    const { flush } = await mount();
    act(() => {
      anchor.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flush();
    expect(named('element_click')[0]).toMatchObject({
      element_id: 'pod-join',
      element_name: 'Join pod',
      element_type: 'button',
      element_text: 'Pay #',
      target_href: 'https://example.com/x',
      screen_name: '/home',
    });
  });

  it('names a plain link and button by their kind and visible text', async () => {
    const link = document.createElement('a');
    link.href = 'https://example.com/y';
    link.textContent = 'Explore';
    const button = document.createElement('button');
    button.id = 'save';
    button.textContent = 'Save';
    document.body.append(link, button);
    const { flush } = await mount();
    act(() => {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flush();
    const [first, second] = named('element_click');
    expect(first).toMatchObject({ element_type: 'link', element_name: 'Explore', element_id: '' });
    expect(second).toMatchObject({ element_type: 'button', element_name: 'Save', element_id: 'save', target_href: '' });
  });

  it('ignores clicks on non-interactive areas', async () => {
    const div = document.createElement('div');
    div.textContent = 'plain';
    document.body.appendChild(div);
    const { flush } = await mount();
    act(() => {
      div.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flush();
    expect(named('element_click')).toHaveLength(0);
  });

  it('closes the screen and sends at once when the tab is hidden, and marks its return', async () => {
    const { flush } = await mount();
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(named('app_background')).toHaveLength(1);
    expect(named('app_background')[0].screen_name).toBe('/home');
    visibility.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await flush();
    expect(named('app_foreground')).toHaveLength(1);
    visibility.mockRestore();
  });

  it('removes its listeners on unmount', async () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    const { unmount, flush } = await mount();
    unmount();
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flush();
    expect(named('element_click')).toHaveLength(0);
  });

  it('reports an opted-in element once when it becomes visible', async () => {
    const el = document.createElement('div');
    el.setAttribute('data-track-impression', 'card-1');
    document.body.appendChild(el);
    const { flush } = await mount();
    expect(ioObserve).toHaveBeenCalled();
    act(() => {
      ioCallback?.([{ target: el, isIntersecting: true }]);
      ioCallback?.([
        { target: el, isIntersecting: true },
        { target: el, isIntersecting: false },
      ]);
    });
    await flush();
    expect(named('element_impression')).toHaveLength(1);
    expect(named('element_impression')[0].element_id).toBe('card-1');
  });

  it('skips the impression observer when no element opted in, and disconnects it on unmount', async () => {
    await mount();
    expect(ioObserve).not.toHaveBeenCalled();
    const el = document.createElement('div');
    el.setAttribute('data-track-impression', 'c');
    document.body.appendChild(el);
    const { unmount } = await mount();
    unmount();
    expect(ioDisconnect).toHaveBeenCalled();
  });
});
