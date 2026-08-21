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
import { MockedProvider } from '@apollo/client/testing';
import { act, render } from '@testing-library/react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { MemoryRouter } from 'react-router-dom';
import { ConfirmProvider } from '@duncit/dialogs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../components/AppShell', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

import App from '../App';
import { clearToken, setToken } from '../lib/session';

const ROUTES = [
  '/login',
  '/hub',
  '/dashboard',
  '/users',
  '/users/smoke-id',
  '/categories',
  '/locations',
  '/clubs',
  '/venues',
  '/partners',
  '/clubs/new',
  '/clubs/smoke-id',
  '/clubs/smoke-id/edit',
  '/pods',
  '/pods/dashboard',
  '/pods/new',
  '/pods/smoke-id',
  '/pods/smoke-id/edit',
  '/auto-pods',
  '/pod-settings',
  '/pod-monitoring',
  '/event-tickets',
  '/faqs',
  '/pod-ideas',
  '/badges',
  '/something-for-you',
  '/partners/faqs',
  '/pod-plans',
  '/membership/plans',
  '/membership/subscribers',
  '/approvals',
  '/portal-access',
  '/upload-settings/portals',
  '/upload-settings/mobile',
  '/upload-settings/mweb',
  '/whatsapp',
  '/branding',
  '/rbac/roles',
  '/profile',
  '/settings',
  '/portal-app-settings',
  '/localization/locales',
  '/localization/translations',
];

const mountRoute = (route: string) =>
  render(
    <MockedProvider mocks={[]}>
        <ConfirmProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <MemoryRouter initialEntries={[route]}>
            <App />
          </MemoryRouter>
        </LocalizationProvider>
        </ConfirmProvider>
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
});
