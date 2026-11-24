import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import AppShell from './AppShell';
import { partnerUser, renderWithProviders } from '../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../__tests__/groupC-link';
import { getToken, setToken } from '../lib/session';
import type { DuncitUser } from '@duncit/user-context';

interface NavStub {
  to?: string;
  label: string;
  children?: NavStub[];
  badge?: { count: number };
}

/** Every route in the menu, groups opened — the Venue Studio nests its options. */
const navRoutes = (items: readonly NavStub[]): string[] =>
  items.flatMap((item) => [...(item.to ? [item.to] : []), ...navRoutes(item.children ?? [])]);

/** Every entry carrying a red count, as `route: count`. */
const navBadges = (items: readonly NavStub[]): string[] =>
  items.flatMap((item) => [...(item.badge ? [`${item.to}: ${item.badge.count}`] : []), ...navBadges(item.children ?? [])]);

interface ShellStubProps {
  nav: NavStub[];
  sidebarHeader: ReactNode;
  user?: DuncitUser;
  loading: boolean;
  profileTo: string;
  onLogout: () => void;
  children: ReactNode;
}

/** The shared chrome has its own suite; this adapter decides what it is handed. */
function ShellStub({ nav, sidebarHeader, user, loading, profileTo, onLogout, children }: Readonly<ShellStubProps>) {
  return (
    <div data-testid="shell" data-loading={loading} data-profile={profileTo}>
      <p data-testid="shell-user">{user?.full_name ?? 'nobody'}</p>
      <div data-testid="sidebar-header">{sidebarHeader}</div>
      <ul>
        {navRoutes(nav).map((to) => (
          <li key={to}>{to}</li>
        ))}
      </ul>
      <p data-testid="nav-badges">{navBadges(nav).join(', ')}</p>
      <button type="button" onClick={onLogout}>
        Log out
      </button>
      {children}
    </div>
  );
}

vi.mock(import('@duncit/shell'), async (importOriginal) => ({
  ...(await importOriginal()),
  AppShell: ShellStub as never,
}));

beforeEach(() => {
  setToken('token-for-test');
});
afterEach(cleanup);

const mount = (
  user: DuncitUser | null,
  route = '/',
  answers: Readonly<Record<string, ScriptedAnswer>> = {},
  sent: SentOperation[] = [],
) =>
  renderWithProviders(
    <AppShell>
      <p>page body</p>
    </AppShell>,
    {
      user,
      route,
      link: scriptedLink({
        PublicFeatureFlags: { publicFeatureFlags: [{ __typename: 'FeatureFlag', key: 'is_product_visible', enabled: true }] },
        ...answers,
      }, sent),
    },
  );

describe('AppShell', () => {
  it('hands the shared chrome the signed-in partner, the profile link and the page', async () => {
    mount(partnerUser({ roles: ['USER', 'VENUE_OWNER'] }), '/venues/options');
    expect((await screen.findByTestId('shell-user')).textContent).toBe('Asha Rao');
    expect(screen.getByTestId('shell').getAttribute('data-profile')).toBe('/profile');
    expect(screen.getByText('page body')).toBeTruthy();
  });

  it('puts the studio switcher in the sidebar header and the active studio’s Options page in the menu', async () => {
    mount(partnerUser({ roles: ['USER', 'VENUE_OWNER', 'HOST'] }), '/venues/options');
    expect(await screen.findByTestId('studio-switcher')).toBeTruthy();
    const menu = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(menu).toContain('/venues/options');
    // The Venue Studio lists its options and its food desk in the sidebar.
    expect(menu).toContain('/venues/dashboard');
    expect(menu).toContain('/venues/food-menu');
    expect(menu).not.toContain('/host/options');
  });

  it('offers the ways in, not a studio, to a partner who holds none', async () => {
    mount(partnerUser({ roles: ['USER'] }));
    await screen.findByTestId('shell');
    expect(screen.queryByTestId('studio-switcher')).toBeNull();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toContain('/be-a-host');
  });

  it('signs out: drops the token and returns to the login page', async () => {
    mount(partnerUser({ roles: ['USER', 'HOST'] }), '/host/options');
    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/login'));
    expect(getToken()).toBeFalsy();
  });

  it('puts what waits on the venue on Workshop & Event Requests', async () => {
    mount(partnerUser({ roles: ['USER', 'VENUE_OWNER'] }), '/venues/dashboard', {
      VenueRequestsWaiting: {
        venueSlotRequestCount: 2,
        myReceivedEventRequestCounts: { __typename: 'EventRequestCounts', open: 1 },
      },
    });
    await waitFor(() => expect(screen.getByTestId('nav-badges').textContent).toBe('/venues/requests: 3'));
  });

  it('shows no count when nothing waits on the venue', async () => {
    const sent: SentOperation[] = [];
    mount(
      partnerUser({ roles: ['USER', 'VENUE_OWNER'] }),
      '/venues/dashboard',
      { VenueRequestsWaiting: { venueSlotRequestCount: 0, myReceivedEventRequestCounts: { __typename: 'EventRequestCounts', open: 0 } } },
      sent,
    );
    await waitFor(() => expect(sent.map((op) => op.name)).toContain('VenueRequestsWaiting'));
    expect(screen.getByTestId('nav-badges').textContent).toBe('');
  });

  it('asks nothing about venue requests outside the venue studio', async () => {
    const sent: SentOperation[] = [];
    mount(partnerUser({ roles: ['USER', 'HOST'] }), '/host/options', {}, sent);
    await screen.findByTestId('shell');
    expect(sent.map((op) => op.name)).not.toContain('VenueRequestsWaiting');
  });
});
