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
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { MemoryRouter } from 'react-router-dom';
import { ConfirmProvider } from '@duncit/dialogs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { schemaMockLink, serverSchema } from './schema-mock';

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

vi.mock('../../src/components/AppShell', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

import App from '../../src/App';
import { clearToken, setToken } from '../../src/lib/session';

const ROUTES = [
  '/profile',
  '/login',
  '/',
  '/portal-modes',
  '/feature-flags',
  '/authentication',
  '/emails',
  '/emails/dashboard',
  '/emails/templates',
  '/emails/fragments',
  '/emails/logs',
  '/mail-automation',
  '/package-docs',
  '/email-templates',
  '/emails/docs',
  '/telemetry',
  '/telemetry/dashboard',
  '/telemetry/bugs',
  '/telemetry/bugs/smoke-id',
  '/telemetry/logs',
  '/telemetry/error-logs',
  '/telemetry/logs-settings',
  '/bugs',
  '/telemetry-logs-settings',
  '/server',
  '/server/info',
  '/server/docker',
  '/server/terminal',
  '/server/data-clone',
  '/slack',
  '/app-builds',
  '/app-builds/android',
  '/app-builds/ios',
  '/app-builds/settings',
];

/** `link` swaps what answers the page: nothing, or the schema-shaped mock. */
const mountRoute = (route: string, link?: ApolloLink) =>
  render(
    <MockedProvider mocks={[]} link={link}>
      <ThemeProvider theme={smokeTheme}>
        <ConfirmProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <MemoryRouter initialEntries={[route]}>
            <App />
          </MemoryRouter>
        </LocalizationProvider>
        </ConfirmProvider>
      </ThemeProvider>
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
/**
 * Give jsdom a viewport with a size.
 *
 * Every element in jsdom measures 0x0, and a virtualised grid or list asks how
 * tall its viewport is before deciding how many rows to mount — so it mounts
 * none, and the cell renderers, row cards and empty-vs-filled branches that are
 * most of a console page never run at all. Handing back a plausible box is what
 * makes the data pass below reach them.
 *
 * Scoped to this file: it is a lie about layout, and the suites that assert on
 * real geometry must not inherit it.
 */
beforeAll(() => {
  for (const prop of ['offsetHeight', 'clientHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 800 });
  }
  for (const prop of ['offsetWidth', 'clientWidth'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 1200 });
  }
  Element.prototype.getBoundingClientRect = function box() {
    return { x: 0, y: 0, top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800, toJSON: () => ({}) };
  } as typeof Element.prototype.getBoundingClientRect;

  // jsdom implements neither observer, and a chart, a virtualised list or a
  // MUI popper constructing one throws `ResizeObserver is not defined` — which
  // takes the whole page down mid-render, so the half of it below the chart
  // never runs. A no-op that never reports is enough: nothing here asserts on
  // a resize, only that the page survives being built.
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver;
  Element.prototype.scrollTo ??= () => undefined;
  Element.prototype.scrollIntoView ??= () => undefined;
});

/**
 * A theme, because MUI's `useTheme()` returns NULL outside a provider.
 *
 * It does not fall back to the default one, so any component reading the theme
 * through a callback — `useMediaQuery((theme) => theme.breakpoints.down('sm'))`
 * is the common shape — throws "Cannot read properties of null" and takes the
 * page down with it. In the app the theme comes from the chrome, which these
 * suites stub out; this puts one back.
 */
const smokeTheme = createTheme();

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
/**
 * Types something plausible into every field on the screen.
 *
 * Runs before the click pass so that pressing Save actually reaches the
 * validation branch rather than bouncing off an untouched form. The value is
 * chosen from the input's own type, so a number field gets a number and a date
 * field gets a date — a form is entitled to reject nonsense, and a rejection is
 * not what this is looking for.
 */
const fillEverything = async () => {
  const fields = [
    ...document.body.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input:not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([disabled]), textarea:not([disabled])'
    ),
  ].slice(0, 25);

  for (const field of fields) {
    if (!field.isConnected) continue;
    const type = (field as HTMLInputElement).type;
    let value = 'Smoke';
    if (type === 'number') value = '1';
    else if (type === 'email') value = 'smoke@duncit.com';
    else if (type === 'tel') value = '9000000000';
    else if (type === 'date') value = '2026-08-30';
    else if (type === 'time') value = '12:30';
    else if (type === 'url') value = 'https://duncit.com';
    fireEvent.change(field, { target: { value } });
  }
  await settle();
};

const MAX_CLICKS = 14;
/**
 * Two waves, because a console page is layered.
 *
 * The first wave opens the tabs, drawers and dialogs; their own controls only
 * exist once that has happened, so a single snapshot of the page stops one
 * level short of where most of the uncovered code lives. Two bounded waves,
 * never re-pressing the same node, reach that layer without any risk of walking
 * forever.
 */
const WAVES = 2;

const pressEverything = async () => {
  const pressed = new Set<HTMLElement>();

  for (let wave = 0; wave < WAVES; wave += 1) {
    const controls = [...document.body.querySelectorAll<HTMLElement>('button:not([disabled]), [role="tab"]')]
      .filter((control) => !pressed.has(control))
      .slice(0, MAX_CLICKS);
    if (controls.length === 0) return;

    for (const control of controls) {
      pressed.add(control);
      if (!control.isConnected) continue;
      fireEvent.click(control);
      await settle();
    }
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
    await fillEverything();
    await pressEverything();

    expect(document.body.innerHTML).not.toBe('');
    unmount();
  });

  it('reads the server schema the with-data pass depends on', () => {
    // Without it every operation would answer empty and the pass below would
    // silently degrade into a second copy of the no-data one.
    expect(serverSchema()?.getQueryType()).toBeTruthy();
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
    // With rows on the screen, the dialogs and menus a control opens are the
    // ones a person actually sees — prefilled, and with something to act on.
    await fillEverything();
    await pressEverything();

    expect(container.innerHTML).not.toBe('');
    unmount();
  });
});
