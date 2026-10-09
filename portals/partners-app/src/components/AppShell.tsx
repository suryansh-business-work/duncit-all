import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useUserData } from '@duncit/user-context';
import { useProductVisibility } from '@duncit/app-settings';
import { AppShell as ShellAppShell } from '@duncit/shell';
import { appConfig, buildNav } from '../config/app-config';
import { clearToken } from '../lib/session';
import StudioSwitcher from './studio/StudioSwitcher';
import { useActiveStudio } from './studio/useActiveStudio';

/**
 * Thin adapter over the shared @duncit/shell chrome: wires this portal's
 * user-context + session into the one common header/sidebar/breadcrumbs.
 * Partners is a portal-gate-exempt surface (any authenticated user may sign in);
 * access is per area instead — buildNav() shows the Options entry of the ONE studio the user is in
 * (the switcher picks among those they hold), and SectionGate keeps each
 * studio's routes to its role.
 */
export default function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const navigate = useNavigate();
  const { user, loading, logout: ctxLogout } = useUserData();
  const { visible: products } = useProductVisibility();
  // ONE studio's menu at a time; the switcher above it moves between them.
  const activeRole = useActiveStudio();

  const logout = () => {
    clearToken();
    ctxLogout();
    navigate('/login', { replace: true });
  };

  return (
    <ShellAppShell
      config={appConfig}
      nav={buildNav(user?.roles, { products, activeRole })}
      sidebarHeader={<StudioSwitcher roles={user?.roles} products={products} active={activeRole} />}
      user={user ?? undefined}
      loading={loading}
      profileTo="/profile"
      onLogout={logout}
    >
      {children}
    </ShellAppShell>
  );
}
