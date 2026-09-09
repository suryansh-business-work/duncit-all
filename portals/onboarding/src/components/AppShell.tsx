import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useUserData } from '@duncit/user-context';
import { AppShell as ShellAppShell } from '@duncit/shell';
import { useProductVisibility } from '@duncit/app-settings';
import { appConfig } from '../config/app-config';
import { withoutEcommNav } from '../config/ecomm-nav';
import { clearToken, hasAppAccess } from '../lib/session';

/**
 * Thin adapter over the shared @duncit/shell chrome: wires this portal's
 * user-context + session into the one common header/sidebar/breadcrumbs.
 * The e-commerce entries are gated on the `is_product_visible` flag so the
 * sidebar only lists routes the server will actually answer.
 */
export default function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const navigate = useNavigate();
  const { user, loading, logout: ctxLogout } = useUserData();
  const { visible: showEcomm } = useProductVisibility();
  const nav = showEcomm ? appConfig.nav : withoutEcommNav(appConfig.nav);

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
