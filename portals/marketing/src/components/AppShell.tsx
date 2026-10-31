import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useUserData } from '@duncit/user-context';
import { AppShell as ShellAppShell } from '@duncit/shell';
import { useMemo } from 'react';
import { appConfig } from '../config/app-config';
import { buildNav } from '../config/nav';
import { clearToken, hasAppAccess } from '../lib/session';

/**
 * Thin adapter over the shared @duncit/shell chrome: wires this portal's
 * user-context + session into the one common header/sidebar/breadcrumbs.
 * The sidebar is built for the signed-in person's roles, so a section they
 * cannot act on is not shown at all.
 */
export default function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const navigate = useNavigate();
  const { user, loading, logout: ctxLogout } = useUserData();
  const nav = useMemo(() => buildNav(user?.roles ?? []), [user?.roles]);

  const logout = () => {
    clearToken();
    ctxLogout();
    navigate('/login', { replace: true });
  };

  return (
    <ShellAppShell
      config={appConfig}
      nav={nav}
      user={user ?? undefined}
      loading={loading}
      hasAccess={user ? hasAppAccess(user.roles) : undefined}
      onDenied={clearToken}
      profileTo="/profile"
      onLogout={logout}
    >
      {children}
    </ShellAppShell>
  );
}
