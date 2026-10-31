import { useMemo, type ReactNode } from 'react';
import { useUserData } from '@duncit/user-context';
import { PortalAppShell } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { buildNav } from '../config/nav';
import { clearToken, hasAppAccess } from '../lib/session';

/**
 * The shared console chrome, with one thing of this portal's own: the sidebar
 * is built for the signed-in person's roles, so a section they cannot act on
 * is not shown at all. Everything else — the session gate, sign-out, the
 * header, sidebar and breadcrumbs — is the shell's PortalAppShell.
 */
export default function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const { user } = useUserData();
  const roles = user?.roles;
  const nav = useMemo(() => buildNav(roles ?? []), [roles]);

  return (
    <PortalAppShell config={appConfig} nav={nav} clearToken={clearToken} hasAppAccess={hasAppAccess} profileTo="/profile">
      {children}
    </PortalAppShell>
  );
}
