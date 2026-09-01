/**
 * The mWeb shell itself, mounted at a handful of routes with no data behind it.
 *
 * `pages-smoke` mounts each routed page on its own; this mounts what wraps
 * them — the providers (cart, tours, status upload), the header, the bottom
 * nav, the route-meta writer, the offline and install banners and the error
 * boundary. It is the one file in the app every single visitor executes, and
 * until now nothing rendered it.
 *
 * The routed page underneath is React.lazy, so what is asserted here is the
 * chrome around the Suspense boundary rather than the page inside it.
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

/**
 * A signed-in reader who holds every role.
 *
 * A token alone is not a session. Partners gates each area on
 * `useUserData().user.roles` and renders NOTHING while the user is still
 * unknown — which, with no provider above it, is forever. Its role-gated pages
 * were therefore at zero however well the queries answered. The portals that do
 * not read a session are unaffected by this.
 */
vi.mock('@duncit/user-context', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useUserData: () => ({
      user: {
        user_id: 'smoke-user',
        full_name: 'Smoke Reader',
        email: 'smoke@duncit.com',
        roles: ['USER', 'HOST', 'VENUE_OWNER', 'CLUB_ADMIN', 'ECOMM_MANAGER', 'ADMIN', 'SUPER_ADMIN'],
        city: 'Bengaluru',
      },
      loading: false,
      error: null,
      refetch: () => undefined,
      logout: () => undefined,
    }),
  };
});

/**
 * jsdom implements neither observer, and the shell mounts components that
 * construct one — a throw there takes the whole page down mid-render, so the
 * half of it below never runs. The theme comes from the app itself here.
 */
beforeAll(() => {
  // It has to REPORT, not merely exist. A carousel or a virtualised list
  // measures itself and renders nothing until the first observation arrives, so
  // an observer that never fires is as good as no size at all — mWeb's club
  // hero (a react-slick slider) fell from 193 covered lines to 53 on a silent
  // one. This answers immediately with the same box getBoundingClientRect gives.
  const box = { x: 0, y: 0, top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 };
  const size = [{ inlineSize: 1200, blockSize: 800 }];

  class SizedResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}

    observe(target: Element) {
      this.callback(
        [{ target, contentRect: box, borderBoxSize: size, contentBoxSize: size, devicePixelContentBoxSize: size }] as never,
        this as never
      );
    }

    unobserve() {}
    disconnect() {}
  }

  class SeenIntersectionObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}

    observe(target: Element) {
      this.callback(
        [{ target, isIntersecting: true, intersectionRatio: 1, boundingClientRect: box, intersectionRect: box, rootBounds: box, time: 0 }] as never,
        this as never
      );
    }

    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  globalThis.ResizeObserver ??= SizedResizeObserver as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver ??= SeenIntersectionObserver as unknown as typeof IntersectionObserver;
  Element.prototype.scrollTo ??= () => undefined;
  Element.prototype.scrollIntoView ??= () => undefined;
});

const mountAt = (route: string) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </MockedProvider>
  );

afterEach(() => {
  localStorage.clear();
});

/**
 * Lets Apollo's rejection land.
 *
 * MockedProvider answers every operation with "No more mocked responses", but
 * that arrives a tick after the mount — so without this the pages are only ever
 * seen in their loading state and their error branch never runs. A page must not
 * throw when its data FAILS either, which is what the flush makes this assert.
 */
/**
 * Longer than the 5-second default, because these tests are deliberately slow.
 *
 * Each one mounts a whole page, waits for its data and then presses every
 * control on it in two waves. On the biggest console that ran past five seconds
 * and vitest cut the test off part-way — which does not fail loudly, it just
 * silently stops opening the dialogs that the later presses would have opened.
 * admin lost 2,673 covered lines to exactly that before the timeout was raised.
 *
 * Thirty seconds, and fourteen presses a wave. The ceiling has to clear the
 * slowest page, but it also has to stay well under the 60-minute budget the
 * coverage job gives each workspace — blowing THAT writes no lcov at all, which
 * would cost far more than a cut-off test.
 */
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

describe('the mWeb shell', () => {
  describe('signed in', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'shell-smoke-token');
    });

    it.each([
      ['the home route', '/'],
      ['a full-bleed route', '/explore'],
      ['the menu route', '/menu'],
      ['the signup survey, which hides the chrome', '/signup-survey'],
      ['a deep pod link', '/club/some-club/pod/some-pod'],
      ['an unknown route', '/no-such-page'],
    ])('mounts on %s', async (_name, route) => {
      const { container, unmount } = mountAt(route);

      expect(container.innerHTML).not.toBe('');
      await settle();
      unmount();
    });
  });

  it('mounts signed out, where the feedback prompt and app popup are not rendered', async () => {
    const { container, unmount } = mountAt('/');

    expect(container.innerHTML).not.toBe('');
    await settle();
    unmount();
  });
});
