import type { ReactNode } from 'react';
import { PortalAppShell } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { runtime } from '../runtime';

const { session } = runtime;

/** This console's chrome: the shared PortalAppShell wired to its own session. */
export default function TestsAppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PortalAppShell
      config={appConfig}
      nav={appConfig.nav}
      clearToken={session.clearToken}
      hasAppAccess={session.hasAppAccess}
      profileTo="/profile"
    >
      {children}
    </PortalAppShell>
  );
}
