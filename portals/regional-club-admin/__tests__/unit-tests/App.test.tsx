import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import App from '../../src/App';
import { clearToken, setToken } from '../../src/lib/session';
import { renderWithProviders } from '../testkit';

const shell = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

// The chrome and the profile page belong to @duncit/shell and are covered by
// its own suite; the route table and the auth gate are what this file owns.
vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  PortalAppShell: (props: Readonly<{ children: ReactNode } & Record<string, unknown>>) => {
    shell.props = props;
    return <div data-testid="portal-shell">{props.children}</div>;
  },
  ProfilePage: () => <div>PROFILE PAGE</div>,
}));
vi.mock('../../src/pages/LoginPage', () => ({ default: () => <div>LOGIN PAGE</div> }));
vi.mock('../../src/pages/region-structure', () => ({ RegionStructurePage: () => <div>REGION CANVAS</div> }));
vi.mock('../../src/pages/club-admins', () => ({ RegionClubAdminsPage: () => <div>CLUB ADMINS</div> }));
vi.mock('../../src/pages/RegionPodDetailsPage', () => ({ default: () => <div>POD DETAILS</div> }));

afterEach(() => {
  clearToken();
  shell.props = null;
});

const open = (path: string) => renderWithProviders(<App />, { initialEntries: [path] });

describe('App routing', () => {
  it('sends a signed-out visitor to the login page', () => {
    open('/club-admins');
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
    expect(screen.queryByTestId('portal-shell')).not.toBeInTheDocument();
  });

  it('serves the login page directly', () => {
    open('/login');
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('opens the region canvas at the root, inside the portal chrome', () => {
    setToken('fixture-session');
    open('/');
    expect(screen.getByTestId('portal-shell')).toContainElement(screen.getByText('REGION CANVAS'));
    expect(shell.props?.profileTo).toBe('/profile');
    expect(shell.props?.nav).toEqual([
      expect.objectContaining({ to: '/' }),
      expect.objectContaining({ to: '/club-admins' }),
    ]);
  });

  it.each([
    ['/club-admins', 'CLUB ADMINS'],
    ['/pods/pod-doc-4821', 'POD DETAILS'],
    ['/profile', 'PROFILE PAGE'],
  ])('serves %s behind the auth gate', (path, page) => {
    setToken('fixture-session');
    open(path);
    expect(screen.getByText(page)).toBeInTheDocument();
  });

  it('sends an unknown address back to the canvas', () => {
    setToken('fixture-session');
    open('/regions/unknown');
    expect(screen.getByText('REGION CANVAS')).toBeInTheDocument();
  });
});
