import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import { AppShell as ShellAppShell } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { clearToken, hasAppAccess } from '../lib/session';
import { useFeatureFlag } from '../hooks/useFeatureFlag';

/**
 * Thin adapter over the shared @duncit/shell chrome: wires this portal's
 * user-context + session into the one common header/sidebar/breadcrumbs.
 * The inventory/e-commerce nav is gated on the `is_product_visible` flag so
 * the sidebar only lists routes that actually resolve (the product routes
 * redirect to the dashboard when the feature is off).
 */
export default function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const navigate = useNavigate();
  const { user, loading, logout: ctxLogout } = useUserData();
  const showProducts = useFeatureFlag('is_product_visible');
  const nav = showProducts ? appConfig.nav : appConfig.nav.filter((item) => item.to === '/');

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
