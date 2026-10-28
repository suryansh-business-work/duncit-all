import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ApolloClient } from '@apollo/client';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { LITE_ME, type LiteMe } from './graphql/documents';
import { readCookie, readStored, removeCookie, removeStored, writeCookie, writeStored } from './storage';

export interface LiteSessionValue {
  signedIn: boolean;
  me: LiteMe | null;
  /** True while a stored token is being checked against the API. */
  resolving: boolean;
  /** Why the account could not be read (API down, network), while there is no account to show; null otherwise. */
  error: unknown;
  completeSignIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<LiteSessionValue | null>(null);

/**
 * Empty the cache and refetch what is on screen under the new token. A page
 * that unmounts as the token changes (a signed-in page on sign-out) has its
 * refetch aborted, which Apollo rejects as an AbortError: that is the page
 * leaving, not a failure. Every other error still reaches the caller.
 */
async function resetCache(client: ApolloClient): Promise<void> {
  try {
    await client.resetStore();
  } catch (error) {
    const aborted = typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
    if (!aborted) throw error;
  }
}

interface Props {
  /** Which localStorage slot holds this page's token (the app and the console differ). */
  tokenKey: string;
  /**
   * The token to start from. The server render passes the cookie's token;
   * the browser passes what the server rendered with, so hydration matches.
   * Omitted: read the stored token (a page with no server render).
   */
  initialToken?: string | null;
  /** The web app mirrors its token into this cookie so the server can render signed-in pages. */
  cookieName?: string;
  children: ReactNode;
}

/** The signed-in account for a page, shared by the web app and the console. */
export function LiteSessionProvider({ tokenKey, initialToken, cookieName, children }: Readonly<Props>) {
  const client = useApolloClient();
  const [token, setToken] = useState<string | null>(() => (initialToken === undefined ? readStored(tokenKey) : initialToken));
  const { data, loading, error, refetch } = useQuery(LITE_ME, { skip: !token, fetchPolicy: 'cache-and-network' });
  const me = token ? ((data as { liteMe?: LiteMe | null } | undefined)?.liteMe ?? null) : null;

  // After the first paint, storage is the truth: adopt a stored token the
  // server did not render with (a session from before the cookie existed),
  // drop a page-load token signed out of since (a remount must not revive it),
  // and keep the cookie in step. Once per mount: later changes go through
  // completeSignIn / signOut.
  const adopted = useRef(false);
  useEffect(() => {
    if (adopted.current || !cookieName) return;
    adopted.current = true;
    const stored = readStored(tokenKey);
    if (stored !== token) setToken(stored);
    if (stored && readCookie(cookieName) !== stored) writeCookie(cookieName, stored);
    if (!stored && readCookie(cookieName)) removeCookie(cookieName);
  }, [cookieName, tokenKey, token]);

  const forget = useCallback(() => {
    removeStored(tokenKey);
    if (cookieName) removeCookie(cookieName);
    setToken(null);
  }, [tokenKey, cookieName]);

  // A stored token the API no longer recognises answers `liteMe: null` — drop it.
  useEffect(() => {
    if (token && !loading && data && (data as { liteMe?: LiteMe | null }).liteMe === null) forget();
  }, [token, loading, data, forget]);

  const completeSignIn = useCallback(
    async (next: string) => {
      writeStored(tokenKey, next);
      if (cookieName) writeCookie(cookieName, next);
      setToken(next);
      await resetCache(client);
    },
    [client, tokenKey, cookieName],
  );

  const signOut = useCallback(async () => {
    forget();
    await resetCache(client);
  }, [client, forget]);

  const refresh = useCallback(async () => {
    if (token) await refetch();
  }, [token, refetch]);

  const value = useMemo<LiteSessionValue>(
    () => ({ signedIn: Boolean(token), me, resolving: Boolean(token) && loading && !me, error: token && !me ? (error ?? null) : null, completeSignIn, signOut, refresh }),
    [token, me, loading, error, completeSignIn, signOut, refresh],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useLiteSession(): LiteSessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useLiteSession needs a LiteSessionProvider');
  return value;
}
