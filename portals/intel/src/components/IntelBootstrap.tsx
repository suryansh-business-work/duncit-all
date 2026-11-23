import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import type { IntelBootstrap as Bootstrap } from '@duncit/gql-types';
import { fireAndForget } from '@duncit/logs';
import { INTEL_BOOTSTRAP, INTEL_SESSION_START, type BootstrapData } from '../graphql/chat';
import { intelLog } from '../lib/logger';

/**
 * What every page needs first: who the person is in Intel (level, reach),
 * the models on offer and the live source states. Loaded once by the shell.
 */

interface BootstrapState {
  data: Bootstrap | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

const BootstrapContext = createContext<BootstrapState>({ data: null, loading: true, error: null, refetch: () => undefined });

export const useBootstrap = () => useContext(BootstrapContext);

const SESSION_FLAG = 'intel_session_logged';

export function IntelBootstrapProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { data, loading, error, refetch } = useQuery<BootstrapData>(INTEL_BOOTSTRAP, { fetchPolicy: 'cache-and-network' });
  const [startSession] = useMutation(INTEL_SESSION_START);

  // The Intel login trail: one audit row per browser session, not per page.
  useEffect(() => {
    let logged = false;
    try {
      logged = sessionStorage.getItem(SESSION_FLAG) === '1';
      sessionStorage.setItem(SESSION_FLAG, '1');
    } catch {
      logged = false;
    }
    if (!logged) fireAndForget(startSession(), intelLog, '/', 'IntelBootstrap');
  }, [startSession]);

  const value = useMemo<BootstrapState>(
    () => ({ data: data?.intelBootstrap ?? null, loading, error: error ?? null, refetch: () => fireAndForget(refetch(), intelLog, '/', 'IntelBootstrap') }),
    [data, loading, error, refetch]
  );
  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}
