import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';

import { STORE_ME, type StoreMe } from '../../graphql/account';
import { MERGE_GUEST } from '../../graphql/cart';
import { getCartToken } from '../../lib/cartToken';
import { storeLog } from '../../lib/log';
import { STORAGE_KEYS, readStored, removeStored, writeStored } from '../../lib/storage';

interface SessionValue {
  signedIn: boolean;
  me: StoreMe | null;
  /** True while a stored token is being checked against `me`. */
  resolving: boolean;
  /** Store a fresh session token, fold the guest cart in, then reload data. */
  completeSignIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  dialogOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const client = useApolloClient();
  const [token, setToken] = useState<string | null>(() => readStored(STORAGE_KEYS.token));
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, loading } = useQuery(STORE_ME, {
    skip: !token,
    fetchPolicy: 'cache-and-network',
  });
  const me = token ? (data?.me ?? null) : null;

  // A stored token the server no longer recognises answers `me: null` — drop it.
  useEffect(() => {
    if (token && !loading && data?.me === null) {
      removeStored(STORAGE_KEYS.token);
      setToken(null);
    }
  }, [token, loading, data]);

  const completeSignIn = useCallback(
    async (next: string) => {
      writeStored(STORAGE_KEYS.token, next);
      setToken(next);
      setDialogOpen(false);
      try {
        await client.mutate({ mutation: MERGE_GUEST, variables: { cart_token: getCartToken() } });
      } catch (error) {
        storeLog.warn('session', 'mergeGuest', { error });
      }
      await client.resetStore();
    },
    [client],
  );

  const signOut = useCallback(async () => {
    removeStored(STORAGE_KEYS.token);
    setToken(null);
    await client.resetStore();
  }, [client]);

  const openSignIn = useCallback(() => setDialogOpen(true), []);
  const closeSignIn = useCallback(() => setDialogOpen(false), []);

  const value = useMemo<SessionValue>(
    () => ({
      signedIn: Boolean(token),
      me,
      resolving: Boolean(token) && loading && !me,
      completeSignIn,
      signOut,
      dialogOpen,
      openSignIn,
      closeSignIn,
    }),
    [token, me, loading, completeSignIn, signOut, dialogOpen, openSignIn, closeSignIn],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useStoreSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useStoreSession needs a SessionProvider');
  return value;
}
