import type { ReactNode } from 'react';
import { PortalAppShell } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { runtime } from '../runtime';
import LiveRunsProvider from './live-runs/LiveRunsProvider';
import LiveRunsStrip from './live-runs/LiveRunsStrip';

const { session } = runtime;

/**
 * This console's chrome: the shared PortalAppShell wired to its own session,
 * with every live run's progress above whichever page is open.
 */
export default function TestsAppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PortalAppShell
      config={appConfig}
      nav={appConfig.nav}
      clearToken={session.clearToken}
      hasAppAccess={session.hasAppAccess}
      profileTo="/profile"
    >
      <LiveRunsProvider>
        <LiveRunsStrip />
        {children}
      </LiveRunsProvider>
    </PortalAppShell>
  );
}
