import type { ReactNode } from 'react';
import { PortalAppShell } from '@duncit/shell';
import { appConfig, SETTINGS_PATH } from '../config/app-config';
import { useIsMcpManager } from '../lib/roles';
import { runtime } from '../runtime';

const { session } = runtime;
const MEMBER_NAV = appConfig.nav.filter((item) => item.to !== SETTINGS_PATH);

/**
 * This console's chrome: the shared PortalAppShell wiring with one thing of its
 * own — Settings is listed only for MCP managers. The page itself also says so
 * to anyone who opens it directly, and the server refuses the settings API to
 * everyone else regardless.
 */
export default function McpAppShell({ children }: Readonly<{ children: ReactNode }>) {
  const nav = useIsMcpManager() ? appConfig.nav : MEMBER_NAV;
  return (
    <PortalAppShell
      config={appConfig}
      nav={nav}
      clearToken={session.clearToken}
      hasAppAccess={session.hasAppAccess}
      profileTo="/profile"
    >
      {children}
    </PortalAppShell>
  );
}
