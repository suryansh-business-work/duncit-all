import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { LiteSessionValue } from '../../shared/session';
import { LITE_ADMIN_SETTINGS, LITE_ADMIN_STATS } from '../graphql/admin';
import { ConsoleRoutes } from '../routes';
import { makeSession, makeSettings, makeStats } from './fixtures';
import { gqlSettings, gqlStats } from './gql-results';
import { renderWithProviders, type GqlMock } from './test-utils';

const state = vi.hoisted(() => ({ session: null as LiteSessionValue | null }));

vi.mock('../../shared/session', () => ({
  useLiteSession: () => {
    if (!state.session) throw new Error('session not set');
    return state.session;
  },
}));

beforeEach(() => {
  state.session = makeSession();
});

const stats: GqlMock = { request: { query: LITE_ADMIN_STATS }, result: { data: { liteAdminStats: gqlStats(makeStats()) } } };

describe('ConsoleRoutes', () => {
  it('shows a visitor the sign-in page wherever they land', async () => {
    state.session = makeSession({ signedIn: false, me: null });
    renderWithProviders(<ConsoleRoutes />, { route: '/settings' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Lite Console' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Console navigation' })).not.toBeInTheDocument();
  });

  it('opens the dashboard inside the console chrome for an admin', async () => {
    renderWithProviders(<ConsoleRoutes />, { route: '/', mocks: [stats] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Console navigation' })).toBeInTheDocument();
  });

  it('routes an admin straight to a console page', async () => {
    renderWithProviders(<ConsoleRoutes />, { route: '/settings', mocks: [{ request: { query: LITE_ADMIN_SETTINGS }, result: { data: { liteAdminSettings: gqlSettings(makeSettings()) } } }] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(await screen.findByTestId('settings-form')).toBeInTheDocument();
  });

  it('sends an unknown address back to the dashboard', async () => {
    renderWithProviders(<ConsoleRoutes />, { route: '/no-such-page', mocks: [stats] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
  });

  it('takes a signed-in admin away from the sign-in page', async () => {
    renderWithProviders(<ConsoleRoutes />, { route: '/login', mocks: [stats] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
  });
});
