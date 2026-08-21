/**
 * Route smoke: every route in this portal is mounted with NO data behind it.
 *
 * Apollo answers nothing here on purpose. That is the state every page is in
 * for its first paint and for the whole of a slow or failed request, so a page
 * that throws instead of showing its loading or empty view is white-screening a
 * real user — and nothing else in this suite mounts most of these pages at all.
 *
 * The chrome is stubbed to a pass-through: the header, sidebar and breadcrumbs
 * belong to @duncit/shell and are covered by that package's own suite, so
 * mounting them here would test the shell once per route instead of the pages.
 *
 * ROUTES is generated from the route table in src/App.tsx.
 */
import type { ReactNode } from 'react';
import type { ApolloLink } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import { act, fireEvent, render } from '@testing-library/react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { schemaMockLink } from './schema-mock';

vi.mock('../../src/components/AppShell', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

import App from '../../src/App';
import { clearToken, setToken } from '../../src/lib/session';

const ROUTES = [
  '/profile',
  '/login',
  '/',
  '/keys',
  '/docs',
];

/** `link` swaps what answers the page: nothing, or the schema-shaped mock. */
const mountRoute = (route: string, link?: ApolloLink) =>
  render(
    <MockedProvider mocks={[]} link={link}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <MemoryRouter initialEntries={[route]}>
          <App />
        </MemoryRouter>
      </LocalizationProvider>
    </MockedProvider>
  );

beforeEach(() => {
  setToken('route-smoke-token');
});

afterEach(() => {
  clearToken();
  vi.clearAllMocks();
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

/**
 * Presses every enabled control the screen offers, once.
 *
 * This is where the dialogs, accordions and tab panels live: a portal page is
 * mostly a table plus a dozen things that only exist after a click, and none of
 * them had ever been rendered. What it asserts is the honest version of that —
 * no control on any screen may throw when it is pressed with no data behind it.
 *
 * The list is taken once, from document.body rather than the container, because
 * MUI renders a dialog into its own portal outside the tree under test. Nodes a
 * click detaches are simply no longer in the document, and firing at them is a
 * no-op, so the walk cannot loop. The cap keeps a page with a hundred row
 * buttons from dominating the run.
 */
const MAX_CLICKS = 20;

const pressEverything = async () => {
  const controls = [...document.body.querySelectorAll<HTMLElement>('button:not([disabled]), [role="tab"]')].slice(
    0,
    MAX_CLICKS
  );

  for (const control of controls) {
    if (!control.isConnected) continue;
    fireEvent.click(control);
    await settle();
  }
};

describe('every route mounts with no data behind it', () => {
  it('covers every path the route table declares, with no duplicates', () => {
    expect(ROUTES.length).toBeGreaterThan(0);
    expect(new Set(ROUTES).size).toBe(ROUTES.length);
  });

  it.each(ROUTES)('mounts %s', async (route) => {
    const { container, unmount } = mountRoute(route);

    expect(container.innerHTML).not.toBe('');
    await settle();
    unmount();
  });

  it.each(ROUTES)('survives every control on %s being pressed', async (route) => {
    const { unmount } = mountRoute(route);

    await settle();
    await pressEverything();

    expect(document.body.innerHTML).not.toBe('');
    unmount();
  });

  /**
   * The same screens again, with the schema-shaped mock answering every query.
   *
   * The no-data pass proves a screen survives a failed request; this one runs the
   * half that only exists once data arrives — the rows, the cards, the chips, the
   * formatted money and dates. See ./schema-mock for what it answers with.
   */
  it.each(ROUTES)('renders %s with data behind it', async (route) => {
    const { container, unmount } = mountRoute(route, schemaMockLink());

    await settle();
    await settle();

    expect(container.innerHTML).not.toBe('');
    unmount();
  });
});
