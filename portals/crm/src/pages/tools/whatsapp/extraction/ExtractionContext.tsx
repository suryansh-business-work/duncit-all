import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  WA_CANCEL_EXTRACTION,
  WA_EXTRACTION,
  WA_START_EXTRACTION,
  type WaExtraction,
} from '../whatsappQueries';
import { getToken } from '../../../../lib/session';

interface ExtractionCtx {
  job: WaExtraction | null;
  starting: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  start: () => Promise<void>;
  cancel: () => Promise<void>;
  onDone?: () => void;
  setOnDone: (cb: (() => void) | undefined) => void;
}

const Ctx = createContext<ExtractionCtx | null>(null);

/** App-wide WhatsApp extraction state: starts a background job and polls its
 * progress so the floating widget persists across navigation. */
export function ExtractionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const authed = !!getToken();
  const [open, setOpen] = useState(false);
  const [onDone, setOnDone] = useState<(() => void) | undefined>(undefined);
  const { data, startPolling, stopPolling, refetch } = useQuery(WA_EXTRACTION, {
    skip: !authed,
    fetchPolicy: 'network-only',
  });
  const [startMut, { loading: starting }] = useMutation(WA_START_EXTRACTION);
  const [cancelMut] = useMutation(WA_CANCEL_EXTRACTION);
  const job: WaExtraction | null = data?.waExtraction ?? null;
  const running = job?.status === 'RUNNING';

  useEffect(() => {
    if (running) startPolling(2000);
    else stopPolling();
  }, [running, startPolling, stopPolling]);

  // Fire the completion callback (e.g. refetch the leads table) once per finish.
  const [lastDone, setLastDone] = useState<string | null>(null);
  useEffect(() => {
    if (job && job.status === 'DONE' && job.id !== lastDone) {
      setLastDone(job.id);
      onDone?.();
    }
  }, [job, lastDone, onDone]);

  const start = useCallback(async () => {
    setOpen(true);
    await startMut().catch(() => undefined);
    await refetch();
    startPolling(2000);
  }, [startMut, refetch, startPolling]);

  const cancel = useCallback(async () => {
    await cancelMut().catch(() => undefined);
    await refetch();
  }, [cancelMut, refetch]);

  const value = useMemo<ExtractionCtx>(
    () => ({ job, starting, open, setOpen, start, cancel, onDone, setOnDone }),
    [job, starting, open, start, cancel, onDone]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExtraction(): ExtractionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useExtraction must be used within an ExtractionProvider');
  return ctx;
}
