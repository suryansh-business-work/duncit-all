import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { WA_EXTRACTION_POLL_MS } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';

import {
  CrmAppWhatsappCancelExtractionDocument,
  CrmAppWhatsappExtractionDocument,
  CrmAppWhatsappStartExtractionDocument,
} from '@/graphql/whatsappGenerator';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

export type WaJob = NonNullable<ResultOf<typeof CrmAppWhatsappExtractionDocument>['waExtraction']>;

const SCOPE = 'crm-app/waExtraction';
/** Consecutive failed reads after which a running job stops being polled (signed out, API down). */
const MAX_FAILED_READS = 4;

interface ExtractionData {
  job: WaJob | null;
  starting: boolean;
  /** The progress card is expanded; collapsed it is a small chip. */
  open: boolean;
  /** A finished job the person dismissed stays hidden until the next one. */
  hiddenId: string | null;
  /** The latest job seen DONE: the browser refreshes once per finish. */
  finishedId: string | null;
  /** Why a start or cancel was refused, worded. */
  error: string | null;
}

interface ExtractionState extends ExtractionData {
  setOpen: (open: boolean) => void;
  dismiss: () => void;
  load: () => Promise<void>;
  start: (fallbackError: string) => Promise<void>;
  cancel: (fallbackError: string) => Promise<void>;
  /** Forget the job and stop polling (signed out). */
  stop: () => void;
}

const INITIAL: ExtractionData = {
  job: null,
  starting: false,
  open: false,
  hiddenId: null,
  finishedId: null,
  error: null,
};

let timer: ReturnType<typeof setTimeout> | undefined;
let failures = 0;
// Bumped by stop(): an answer to a request sent before it is dropped.
let generation = 0;

const clearPoll = () => {
  clearTimeout(timer);
  timer = undefined;
};

/**
 * The WhatsApp extraction running in the background, app-wide — the portal's
 * ExtractionProvider. Starting a job opens the progress card; a RUNNING job is
 * re-read every couple of seconds wherever the person is in the app, so the
 * banner keeps moving while they work elsewhere.
 */
export const useWaExtraction = create<ExtractionState>((set, get) => {
  const schedule = () => {
    clearPoll();
    if (get().job?.status !== 'RUNNING' || failures >= MAX_FAILED_READS) return;
    timer = setTimeout(
      () => fireAndForget(get().load(), logs.mobileApp, SCOPE, 'poll'),
      WA_EXTRACTION_POLL_MS,
    );
  };

  return {
    ...INITIAL,
    setOpen: (open) => set({ open }),
    dismiss: () => set((s) => ({ hiddenId: s.job?.id ?? null })),
    load: async () => {
      const sent = generation;
      try {
        const { waExtraction } = await gqlRequest(CrmAppWhatsappExtractionDocument, {});
        if (sent !== generation) return;
        failures = 0;
        set((s) => ({
          job: waExtraction ?? null,
          finishedId: waExtraction?.status === 'DONE' ? waExtraction.id : s.finishedId,
        }));
      } catch (error) {
        if (sent !== generation) return;
        failures += 1;
        logs.mobileApp.warn(SCOPE, 'load', { error, failures });
      }
      schedule();
    },
    start: async (fallbackError) => {
      const sent = generation;
      set({ open: true, starting: true, error: null });
      try {
        await gqlRequest(CrmAppWhatsappStartExtractionDocument, {});
      } catch (error) {
        logs.mobileApp.warn(SCOPE, 'start', { error });
        set({ error: errorMessage(error, fallbackError) });
      } finally {
        set({ starting: false });
      }
      failures = 0;
      if (sent === generation) await get().load();
    },
    cancel: async (fallbackError) => {
      set({ error: null });
      try {
        await gqlRequest(CrmAppWhatsappCancelExtractionDocument, {});
      } catch (error) {
        logs.mobileApp.warn(SCOPE, 'cancel', { error });
        set({ error: errorMessage(error, fallbackError) });
      }
      await get().load();
    },
    stop: () => {
      generation += 1;
      failures = 0;
      clearPoll();
      set(INITIAL);
    },
  };
});
