import type { ReactNode } from 'react';
import { PortalAppShell } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { clearToken, hasAppAccess } from '../lib/session';

/**
 * The shared console chrome with this portal's config and session. The
 * session gate, sign-out, header, sidebar and breadcrumbs are the shell's
 * PortalAppShell — the wiring every console used to copy.
 */
export default function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PortalAppShell
      config={appConfig}
      nav={appConfig.nav}
      clearToken={clearToken}
      hasAppAccess={hasAppAccess}
      profileTo="/profile"
    >
      {children}
    </PortalAppShell>
  );
}
