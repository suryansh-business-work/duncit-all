import { useEffect, useState, type ReactNode } from 'react';
import { MaintenanceScreen, UnderDevelopmentScreen } from './screens';

export type PortalModeState = 'LIVE' | 'MAINTENANCE' | 'DEVELOPMENT';

export interface PortalModeGateProps {
  /** The portal/app key registered on the server (matches appConfig.key). */
  portalKey: string;
  /** Absolute GraphQL endpoint to poll (e.g. urlConfigs.graphqlUrl). */
  graphqlUrl: string;
  /** Friendly name shown on the blocking screens. */
  appName?: string;
  /** Poll interval in ms; defaults to 60s. */
  pollMs?: number;
  children: ReactNode;
}

const QUERY = 'query PortalMode($key:String!){portalMode(key:$key){mode}}';

/**
 * Blocks the wrapped app with a maintenance / under-development screen when the
 * Tech portal has switched this portal off Live. Uses a plain unauthenticated
 * fetch (no Apollo dependency) and **fails open** — any network error keeps the
 * app rendered so a server blip never locks everyone out. Re-checks on an
 * interval so apps recover automatically when set back to Live.
 */
export default function PortalModeGate({
  portalKey,
  graphqlUrl,
  appName,
  pollMs = 60000,
  children,
}: Readonly<PortalModeGateProps>) {
  const [mode, setMode] = useState<PortalModeState>('LIVE');

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch(graphqlUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: QUERY, variables: { key: portalKey } }),
        });
        const json = await res.json();
        const next = json?.data?.portalMode?.mode as PortalModeState | undefined;
        if (active && next) setMode(next);
      } catch {
        // Fail open — never block on a transient error.
        if (active) setMode('LIVE');
      }
    };
    check();
    const timer = globalThis.setInterval(check, pollMs);
    return () => {
      active = false;
      globalThis.clearInterval(timer);
    };
  }, [portalKey, graphqlUrl, pollMs]);

  if (mode === 'MAINTENANCE') return <MaintenanceScreen appName={appName} />;
  if (mode === 'DEVELOPMENT') return <UnderDevelopmentScreen appName={appName} />;
  return <>{children}</>;
}
