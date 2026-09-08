import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useUserData } from '@duncit/user-context';
import { AppShell, type AppShellPortalConfig } from './AppShell';
import type { AppNavItem } from '../types';

export interface PortalAppShellProps {
  config: AppShellPortalConfig;
  nav: AppNavItem[];
  /** Drops the portal's own token — used on sign-out AND on a denied session. */
  clearToken: () => void;
  /** The portal's role gate, from `createSession`. */
  hasAppAccess: (roles?: readonly string[] | null) => boolean;
  /** Route of the profile page; omit to hide the Profile menu item. */
  profileTo?: string;
  children: ReactNode;
}

/**
 * The wiring every console repeats around `<AppShell>`: read the signed-in
 * user from the shared context, gate it with the portal's own roles, and make
 * sign-out drop the token, clear the context and land on /login.
 *
 * Seventeen portals each keep a byte-identical `components/AppShell.tsx` doing
 * exactly this — the shape rule 40 exists to stop. This is its home. A portal
 * with chrome of its own still renders `<AppShell>` directly; this is only for
 * the (overwhelmingly common) case where the wiring is the whole adapter.
 */
export function PortalAppShell({
  config,
  nav,
  clearToken,
  hasAppAccess,
  profileTo,
  children,
}: Readonly<PortalAppShellProps>) {
  const navigate = useNavigate();
  const { user, loading, logout } = useUserData();

  const signOut = () => {
    clearToken();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      config={config}
      nav={nav}
      user={user ?? undefined}
      loading={loading}
      hasAccess={user ? hasAppAccess(user.roles) : undefined}
      onDenied={clearToken}
      profileTo={profileTo}
      onLogout={signOut}
    >
      {children}
    </AppShell>
  );
}
