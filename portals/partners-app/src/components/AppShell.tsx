import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import { AppShell as ShellAppShell } from '@duncit/shell';
import { appConfig, buildNav } from '../config/app-config';
import { clearToken } from '../lib/session';

/**
 * Thin adapter over the shared @duncit/shell chrome: wires this portal's
 * user-context + session into the one common header/sidebar/breadcrumbs.
 * Partners is a portal-gate-exempt surface (any authenticated user may sign in),
 * so no client-side role gate is applied — the nav adapts to the user's roles.
 */
export default function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const navigate = useNavigate();
  const { user, loading, logout: ctxLogout } = useUserData();

  const logout = () => {
    clearToken();
    ctxLogout();
    navigate('/login', { replace: true });
  };

  return (
    <ShellAppShell
      config={appConfig}
      nav={buildNav(user?.roles)}
      user={user ?? undefined}
      loading={loading}
      profileTo="/profile"
      onLogout={logout}
    >
      {children}
    </ShellAppShell>
  );
}
