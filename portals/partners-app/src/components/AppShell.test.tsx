import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import AppShell from './AppShell';
import { partnerUser, renderWithProviders } from '../__tests__/render';
import { scriptedLink } from '../__tests__/groupC-link';
import { getToken, setToken } from '../lib/session';
import type { DuncitUser } from '@duncit/user-context';

interface ShellStubProps {
  nav: { to: string; label: string }[];
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
        {nav.map((item) => (
          <li key={item.to}>{item.to}</li>
        ))}
      </ul>
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

const mount = (user: DuncitUser | null, route = '/') =>
  renderWithProviders(
    <AppShell>
      <p>page body</p>
    </AppShell>,
    {
      user,
      route,
      link: scriptedLink({
        PublicFeatureFlags: { publicFeatureFlags: [{ __typename: 'FeatureFlag', key: 'is_product_visible', enabled: true }] },
      }),
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
});
