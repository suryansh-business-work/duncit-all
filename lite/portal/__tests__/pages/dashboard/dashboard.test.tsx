import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { createTranslator } from '@duncit/i18n';
import { PORTAL_FALLBACK } from '../../../../shared/i18n';
import { LITE_ADMIN_STATS, type LiteAdminStats } from '../../../graphql/admin';
import { NAV_ITEMS } from '../../../layout/nav-items';
import { DashboardPage } from '../../../pages/dashboard';
import { QUICK_LINK_PATHS, STAT_TILES } from '../../../pages/dashboard/stat-tiles';
import { makeStats } from '../../fixtures';
import { gqlStats } from '../../gql-results';
import { renderWithProviders, type GqlMock } from '../../test-utils';

const { has } = createTranslator({ locale: 'en-IN', fallback: PORTAL_FALLBACK });
const navPaths = new Set(NAV_ITEMS.map((item) => item.path));

describe('STAT_TILES', () => {
  it('covers every stat once, each with real copy and a console page to open', () => {
    expect(STAT_TILES.map((tile) => tile.key)).toEqual(Object.keys(makeStats()));
    for (const tile of STAT_TILES) {
      expect(has(tile.labelKey), tile.labelKey).toBe(true);
      expect(navPaths.has(tile.to), tile.to).toBe(true);
    }
  });

  it('formats only the confirmed revenue as money', () => {
    expect(STAT_TILES.filter((tile) => tile.money).map((tile) => tile.key)).toEqual(['revenue_confirmed']);
  });

  it('repeats only sidebar pages as quick links', () => {
    for (const path of QUICK_LINK_PATHS) expect(navPaths.has(path), path).toBe(true);
  });
});

const statsQuery = (over: Partial<LiteAdminStats> = {}): GqlMock => ({ request: { query: LITE_ADMIN_STATS }, result: { data: { liteAdminStats: gqlStats(makeStats(over)) } } });

describe('DashboardPage', () => {
  it('shows each stat in its tile with Indian digit grouping, linking to its page', async () => {
    renderWithProviders(<DashboardPage />, { mocks: [statsQuery({ users: 1_250_000 })] });
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    const users = within(await screen.findByTestId('stat-users'));
    expect(users.getByText('Users')).toBeInTheDocument();
    expect(users.getByText('12,50,000')).toBeInTheDocument();
    expect(users.getByRole('link')).toHaveAttribute('href', '/users');
    const emails = within(screen.getByTestId('stat-emails_sent_7d'));
    expect(emails.getByText('Emails sent (7 days)')).toBeInTheDocument();
    expect(emails.getByRole('link')).toHaveAttribute('href', '/email-logs');
  });

  it('shows the confirmed revenue in rupees', async () => {
    renderWithProviders(<DashboardPage />, { mocks: [statsQuery({ revenue_confirmed: 125_000 })] });
    const revenue = within(await screen.findByTestId('stat-revenue_confirmed'));
    expect(revenue.getByText('Confirmed revenue')).toBeInTheDocument();
    expect(revenue.getByText('₹1,25,000')).toBeInTheDocument();
  });

  it('draws all nine tiles', async () => {
    renderWithProviders(<DashboardPage />, { mocks: [statsQuery()] });
    await screen.findByTestId('stat-users');
    for (const tile of STAT_TILES) expect(screen.getByTestId(`stat-${tile.key}`)).toBeInTheDocument();
  });

  it('offers the quick links while the stats load, and after', async () => {
    renderWithProviders(<DashboardPage />, { mocks: [statsQuery()] });
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
    expect(screen.getByText('Quick links')).toBeInTheDocument();
    for (const [name, href] of [
      ['Events', '/events'],
      ['Users', '/users'],
      ['Registrations', '/registrations'],
      ['Email logs', '/email-logs'],
      ['Settings', '/settings'],
    ]) {
      expect(screen.getByRole('link', { name }), name).toHaveAttribute('href', href);
    }
    expect(screen.queryByRole('link', { name: 'Cities' })).not.toBeInTheDocument();
    await screen.findByTestId('stat-users');
  });

  it('shows the error when the stats cannot load, keeping the quick links', async () => {
    renderWithProviders(<DashboardPage />, { mocks: [{ request: { query: LITE_ADMIN_STATS }, error: new Error('Stats are warming up') }] });
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Stats are warming up');
    expect(screen.queryByTestId('stat-users')).not.toBeInTheDocument();
    expect(screen.getByTestId('quick-link-settings')).toBeInTheDocument();
  });
});
