import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import { useFeatureFlag, useProductVisibility } from '@duncit/app-settings';
import { AppShell as ShellAppShell } from '@duncit/shell';
import { appConfig, buildNav } from '../config/app-config';
import { clearToken } from '../lib/session';

/**
 * Thin adapter over the shared @duncit/shell chrome: wires this portal's
 * user-context + session into the one common header/sidebar/breadcrumbs.
 * Partners is a portal-gate-exempt surface (any authenticated user may sign in);
 * access is per area instead — buildNav() shows the partner sections the user
 * holds, and SectionGate keeps their routes to the same roles.
 */
export default function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const navigate = useNavigate();
  const { user, loading, logout: ctxLogout } = useUserData();
  // The shell's nav config has no flag of its own, so the gate is applied here,
  // where the portal already assembles its role-adaptive sidebar.
  const autoPods = useFeatureFlag('auto_pods');
  const { visible: products } = useProductVisibility();

  const logout = () => {
    clearToken();
    ctxLogout();
    navigate('/login', { replace: true });
  };

  return (
    <ShellAppShell
      config={appConfig}
      nav={buildNav(user?.roles, { autoPods, products })}
      user={user ?? undefined}
      loading={loading}
      profileTo="/profile"
      onLogout={logout}
    >
      {children}
    </ShellAppShell>
  );
}
