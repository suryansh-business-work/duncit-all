import type { ReactNode } from 'react';
import { PortalAppShell } from '@duncit/shell';
import { useProductVisibility } from '@duncit/app-settings';
import { appConfig } from '../config/app-config';
import { withoutEcommNav } from '../config/ecomm-nav';
import { clearToken, hasAppAccess } from '../lib/session';

/**
 * This portal's chrome: the shared PortalAppShell wiring (user context, role
 * gate, sign-out) with one thing of its own — the e-commerce entries are gated
 * on the `is_product_visible` flag so the sidebar only lists routes the server
 * will actually answer.
 */
export default function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const { visible: showEcomm } = useProductVisibility();
  const nav = showEcomm ? appConfig.nav : withoutEcommNav(appConfig.nav);

  return (
    <PortalAppShell
      config={appConfig}
      nav={nav}
      clearToken={clearToken}
      hasAppAccess={hasAppAccess}
      profileTo="/profile"
    >
      {children}
    </PortalAppShell>
  );
}
