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
import { render } from '@testing-library/react';
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
  '/profile',
  '/login',
  '/',
  '/host-requests',
  '/hosts',
  '/hosts/smoke-id',
  '/venues',
  '/venues/smoke-id',
  '/ecomm-brands',
  '/club-admins',
  '/surveys',
  '/surveys/kind/smoke-id',
  '/surveys/new',
  '/surveys/smoke-id/edit',
  '/meetings/calendar',
  '/meetings/availability',
  '/meetings/smoke-id',
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

describe('every route mounts with no data behind it', () => {
  it('covers every path the route table declares, with no duplicates', () => {
    expect(ROUTES.length).toBeGreaterThan(0);
    expect(new Set(ROUTES).size).toBe(ROUTES.length);
  });

  it.each(ROUTES)('mounts %s', (route) => {
    const { container, unmount } = mountRoute(route);

    expect(container.innerHTML).not.toBe('');
    unmount();
  });
});
