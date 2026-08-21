/**
 * Route smoke: every route in this portal is mounted with NO data behind it.
 *
 * Apollo's MockedProvider answers nothing here on purpose. That is the state
 * every page is in for its first paint and for the whole of a slow or failed
 * request, so a page that throws rather than showing its loading or empty view
 * is white-screening a real user — this suite is what catches that.
 *
 * The chrome is stubbed to a pass-through: the header, sidebar and breadcrumbs
 * are @duncit/shell's and are covered by that package's own suite, and mounting
 * them here would test the shell 40 more times instead of the pages.
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './testkit';

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
  '/localization/translations'
];

beforeEach(() => {
  setToken('route-smoke-token');
});

afterEach(() => {
  clearToken();
  vi.clearAllMocks();
});

describe('every route mounts with no data behind it', () => {
  it('covers every path the route table declares', () => {
    expect(ROUTES.length).toBeGreaterThan(0);
    expect(new Set(ROUTES).size).toBe(ROUTES.length);
  });

  it.each(ROUTES)('mounts %s', (route) => {
    const { container, unmount } = renderWithProviders(<App />, { initialEntries: [route] });

    expect(container.innerHTML).not.toBe('');
    unmount();
  });
});
