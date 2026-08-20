import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import { AppShell as ShellAppShell, type AppNavItem } from '@duncit/shell';
import { useFeatureFlag } from '@duncit/app-settings';
import { appConfig, AUTO_PODS_PATH } from '../config/app-config';
import { clearToken, hasAppAccess } from '../lib/session';

/** Drops one route from the nav tree, children included. */
function navWithout(items: AppNavItem[], path: string): AppNavItem[] {
  return items
    .filter((item) => item.to !== path)
    .map((item) => (item.children ? { ...item, children: navWithout(item.children, path) } : item));
}

/**
 * Thin adapter over the shared @duncit/shell chrome: wires admin's
 * user-context + session into the one common header/sidebar/breadcrumbs.
 * Auto Pods are hidden from the sidebar and the global search while the
 * `auto_pods` flag is off, so the chrome only lists routes that resolve.
 */
export default function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const navigate = useNavigate();
  const { user, loading, logout: ctxLogout } = useUserData();
  const autoPods = useFeatureFlag('auto_pods');

  const nav = useMemo(
    () => (autoPods ? appConfig.nav : navWithout(appConfig.nav, AUTO_PODS_PATH)),
    [autoPods]
  );
  const searchItems = useMemo(
    () =>
      autoPods
        ? appConfig.searchItems
        : appConfig.searchItems.filter((item) => item.to !== AUTO_PODS_PATH),
    [autoPods]
  );

  const logout = () => {
    clearToken();
    ctxLogout();
    navigate('/login', { replace: true });
  };

  return (
    <ShellAppShell
      config={appConfig}
      nav={nav}
      searchItems={searchItems}
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
