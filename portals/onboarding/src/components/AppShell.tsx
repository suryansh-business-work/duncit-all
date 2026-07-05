import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import { AppShell as ShellAppShell } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { clearToken, hasAppAccess } from '../lib/session';

/**
 * Thin adapter over the shared @duncit/shell chrome: wires this portal's
 * user-context + session into the one common header/sidebar/breadcrumbs.
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
      nav={appConfig.nav}
      user={user ?? undefined}
      loading={loading}
      hasAccess={user ? hasAppAccess(user.roles) : undefined}
      onDenied={clearToken}
      onLogout={logout}
    >
      {children}
    </ShellAppShell>
  );
}
