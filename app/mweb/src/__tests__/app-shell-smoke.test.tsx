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
import { MockedProvider } from '@apollo/client/testing';
import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const mountAt = (route: string) =>
  render(
    <MockedProvider mocks={[]}>
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
