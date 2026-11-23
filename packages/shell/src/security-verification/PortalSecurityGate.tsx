import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useLocation } from 'react-router';
import { AUTH_CHANGED_EVENT, emitAuthChanged, useUserData } from '@duncit/user-context';
import { clearToken, readToken, useShellRuntime } from '../lib/runtime';
import { PORTAL_SECURITY_CHALLENGE } from './documents';
import { SecurityVerificationScreen } from './SecurityVerificationScreen';
import { PORTAL_SECURITY_RECHECK_EVENT, isPortalTokenPending, isPortalTokenVerified } from './sessionClaim';

interface Props {
  /** The console's name for the heading, e.g. "Duncit Finance". */
  portalName: string;
  children: ReactNode;
}

/**
 * Puts the Security Verification screen in front of a console.
 *
 * Mounted once, around the whole route tree, so it covers every console the same
 * way and a console cannot forget it: while the session token has not completed
 * the screen, whatever address was asked for shows the screen instead — and when
 * it is completed the page reloads at that same address. The login page is the
 * one exception, so a person on the screen can still back out and sign in as
 * someone else.
 *
 * A token that already completed it is checked once on load, and again whenever
 * a request is refused as signed-out: if the terms changed since, the server
 * answers the challenge and the screen comes back. A session with no claim at
 * all (a console already signed in before this existed) is left alone.
 */
export function PortalSecurityGate({ portalName, children }: Readonly<Props>) {
  const runtime = useShellRuntime();
  const client = useApolloClient();
  const location = useLocation();
  const { logout } = useUserData();
  const [token, setToken] = useState(() => readToken(runtime));
  const [owedAgain, setOwedAgain] = useState(false);

  useEffect(() => {
    const sync = () => {
      setToken(readToken(runtime));
      setOwedAgain(false);
    };
    globalThis.window.addEventListener(AUTH_CHANGED_EVENT, sync);
    globalThis.window.addEventListener('storage', sync);
    return () => {
      globalThis.window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      globalThis.window.removeEventListener('storage', sync);
    };
  }, [runtime]);

  // The challenge answers only for a session that owes the screen, so an answer at all means "yes, again".
  const askServer = useCallback(() => {
    client
      .query({ query: PORTAL_SECURITY_CHALLENGE, fetchPolicy: 'network-only' })
      .then(() => setOwedAgain(true))
      .catch(() => undefined);
  }, [client]);

  const verified = isPortalTokenVerified(token);
  useEffect(() => {
    if (!verified) return undefined;
    askServer();
    globalThis.window.addEventListener(PORTAL_SECURITY_RECHECK_EVENT, askServer);
    return () => globalThis.window.removeEventListener(PORTAL_SECURITY_RECHECK_EVENT, askServer);
  }, [verified, askServer]);

  const signOut = () => {
    clearToken(runtime);
    emitAuthChanged();
    logout();
  };

  const owed = isPortalTokenPending(token) || owedAgain;
  if (owed && location.pathname !== '/login') {
    return <SecurityVerificationScreen portalName={portalName} onSignOut={signOut} />;
  }
  return <>{children}</>;
}
