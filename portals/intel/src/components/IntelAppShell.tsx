import { useMemo, type ReactNode } from 'react';
import { PortalAppShell } from '@duncit/shell';
import { ADMIN_ONLY_PATHS, appConfig } from '../config/app-config';
import { runtime } from '../runtime';
import { ChatStreamProvider } from './ChatStream';
import { IntelBootstrapProvider, useBootstrap } from './IntelBootstrap';

const { session } = runtime;

/** The menu for this person: admin pages are left out for employees (the server refuses them too). */
function IntelChrome({ children }: Readonly<{ children: ReactNode }>) {
  const { data } = useBootstrap();
  const canAdmin = data?.me.can_admin ?? false;
  const nav = useMemo(() => appConfig.nav.filter((item) => canAdmin || !item.to || !ADMIN_ONLY_PATHS.has(item.to)), [canAdmin]);
  return (
    <PortalAppShell config={appConfig} nav={nav} clearToken={session.clearToken} hasAppAccess={session.hasAppAccess} profileTo="/profile">
      {children}
    </PortalAppShell>
  );
}

/** This console's chrome: the shared portal shell (login, light/dark mode, menu) around the bootstrap. */
export default function IntelAppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <IntelBootstrapProvider>
      <ChatStreamProvider>
        <IntelChrome>{children}</IntelChrome>
      </ChatStreamProvider>
    </IntelBootstrapProvider>
  );
}
