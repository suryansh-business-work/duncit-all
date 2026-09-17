import { createContext, useContext } from 'react';
import type { BackgroundJob } from './queries';

/** What the header's progress control reads and does. */
export interface BackgroundJobsApi {
  /** Running and not-yet-dismissed jobs, newest first. */
  jobs: readonly BackgroundJob[];
  cancel: (id: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  clearFinished: () => Promise<void>;
}

export const BackgroundJobsContext = createContext<BackgroundJobsApi | null>(null);

/** Null outside `BackgroundJobsProvider` — the header then shows nothing. */
export function useBackgroundJobs(): BackgroundJobsApi | null {
  return useContext(BackgroundJobsContext);
}
