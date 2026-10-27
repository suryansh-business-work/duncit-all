import type { ReactNode } from 'react';
import { PortalAppShell } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { runtime } from '../runtime';

const { session } = runtime;

/**
 * This console's chrome: the shared PortalAppShell wiring with detailed change
 * logs on — coins and gift cards are money, so every table change log also
 * names the account, its roles, the surface, the address and the browser.
 */
export default function LoyaltyAppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PortalAppShell
      config={appConfig}
      nav={appConfig.nav}
      clearToken={session.clearToken}
      hasAppAccess={session.hasAppAccess}
      profileTo="/profile"
      detailedChangeLogs
    >
      {children}
    </PortalAppShell>
  );
}
