import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { LITE_ME, type LiteMe } from './graphql/documents';
import { readStored, removeStored, writeStored } from './storage';

export interface LiteSessionValue {
  signedIn: boolean;
  me: LiteMe | null;
  /** True while a stored token is being checked against the API. */
  resolving: boolean;
  completeSignIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<LiteSessionValue | null>(null);

interface Props {
  /** Which localStorage slot holds this page's token (the app and the console differ). */
  tokenKey: string;
  children: ReactNode;
}

/** The signed-in account for a page, shared by the web app and the console. */
export function LiteSessionProvider({ tokenKey, children }: Readonly<Props>) {
  const client = useApolloClient();
  const [token, setToken] = useState<string | null>(() => readStored(tokenKey));
  const { data, loading, refetch } = useQuery(LITE_ME, { skip: !token, fetchPolicy: 'cache-and-network' });
  const me = token ? ((data as { liteMe?: LiteMe | null } | undefined)?.liteMe ?? null) : null;

  // A stored token the API no longer recognises answers `liteMe: null` — drop it.
  useEffect(() => {
    if (token && !loading && data && (data as { liteMe?: LiteMe | null }).liteMe === null) {
      removeStored(tokenKey);
      setToken(null);
    }
  }, [token, loading, data, tokenKey]);

  const completeSignIn = useCallback(
    async (next: string) => {
      writeStored(tokenKey, next);
      setToken(next);
      await client.resetStore();
    },
    [client, tokenKey],
  );

  const signOut = useCallback(async () => {
    removeStored(tokenKey);
    setToken(null);
    await client.resetStore();
  }, [client, tokenKey]);

  const refresh = useCallback(async () => {
    if (token) await refetch();
  }, [token, refetch]);

  const value = useMemo<LiteSessionValue>(
    () => ({ signedIn: Boolean(token), me, resolving: Boolean(token) && loading && !me, completeSignIn, signOut, refresh }),
    [token, me, loading, completeSignIn, signOut, refresh],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useLiteSession(): LiteSessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useLiteSession needs a LiteSessionProvider');
  return value;
}
