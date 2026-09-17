import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { createLogger } from '@duncit/logs';
import { TableBulkDeleteProvider, type BulkDeleteRequest, type TableBulkDeleteApi } from '@duncit/table';
import { useTranslation } from '../i18n/useTranslation';
import { BackgroundJobsContext, type BackgroundJobsApi } from './backgroundJobsContext';
import { isRunning } from './job-progress';
import {
  BULK_DELETABLE_TABLES,
  CANCEL_BACKGROUND_JOB,
  CLEAR_FINISHED_BACKGROUND_JOBS,
  DISMISS_BACKGROUND_JOB,
  MY_BACKGROUND_JOBS,
  START_BULK_DELETE,
  type BackgroundJob,
} from './queries';
import { useJobSettlement } from './useJobSettlement';

const logger = createLogger('portal');

/** Often enough for the ring to move while a batch lands; only while something runs. */
const POLL_MS = 1500;
const NO_JOBS: BackgroundJob[] = [];
const NO_TABLES: string[] = [];

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const logRefetch = (error: unknown) => {
  logger.warn('backgroundJobs', 'refetch', { error, msg: 'Could not reload background jobs' });
};

const toInput = (request: BulkDeleteRequest) => ({
  table: request.table,
  mode: request.mode,
  variables: JSON.stringify(request.variables),
  ids: request.mode === 'SELECTED' ? request.ids : null,
  label: request.label,
  url: request.url,
});

export interface BackgroundJobsProviderProps {
  /** Signed in. Nothing is asked of the server before that. */
  enabled: boolean;
  children: ReactNode;
}

/**
 * The console's background work, owned by the shell rather than by a page.
 *
 * The jobs themselves live on the server, so this only reads them: once on
 * mount (a refresh shows the same progress), every 1.5s while one is running,
 * and again whenever the tab comes back into view (a job started in another
 * tab or console). It hands every grid below the bulk delete it offers, and
 * the header the jobs it shows.
 */
export function BackgroundJobsProvider({ enabled, children }: Readonly<BackgroundJobsProviderProps>) {
  const { t } = useTranslation();
  const tablesQuery = useQuery<{ bulkDeletableTables: string[] }>(BULK_DELETABLE_TABLES, { skip: !enabled });
  const jobsQuery = useQuery<{ myBackgroundJobs: BackgroundJob[] }>(MY_BACKGROUND_JOBS, {
    skip: !enabled,
    fetchPolicy: 'network-only',
  });
  const [startDelete] = useMutation<{ startBulkDelete: { id: string } }>(START_BULK_DELETE);
  const [cancelJob] = useMutation(CANCEL_BACKGROUND_JOB);
  const [dismissJob] = useMutation(DISMISS_BACKGROUND_JOB);
  const [clearJobs] = useMutation(CLEAR_FINISHED_BACKGROUND_JOBS);
  const jobs = jobsQuery.data?.myBackgroundJobs ?? NO_JOBS;
  const deletable = tablesQuery.data?.bulkDeletableTables ?? NO_TABLES;
  const { startPolling, stopPolling, refetch } = jobsQuery;
  const hasRunning = jobs.some(isRunning);
  const { track, subscribe } = useJobSettlement(jobs);

  useEffect(() => {
    if (!hasRunning) return undefined;
    startPolling(POLL_MS);
    return () => stopPolling();
  }, [hasRunning, startPolling, stopPolling]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetch().catch(logRefetch);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, refetch]);

  const start = useCallback(
    async (request: BulkDeleteRequest) => {
      let id: string | undefined;
      try {
        const { data } = await startDelete({ variables: { input: toInput(request) } });
        id = data?.startBulkDelete.id;
      } catch (error) {
        notifyError(messageOf(error));
        return false;
      }
      if (id) track(id);
      notifySuccess(t('shell.jobs.startedNotice'));
      refetch().catch(logRefetch);
      return true;
    },
    [startDelete, track, refetch, t]
  );

  const act = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
      } catch (error) {
        notifyError(messageOf(error));
      }
      refetch().catch(logRefetch);
    },
    [refetch]
  );

  const cancel = useCallback((id: string) => act(() => cancelJob({ variables: { id } })), [act, cancelJob]);
  const dismiss = useCallback((id: string) => act(() => dismissJob({ variables: { id } })), [act, dismissJob]);
  const clearFinished = useCallback(() => act(() => clearJobs()), [act, clearJobs]);

  const tableApi = useMemo<TableBulkDeleteApi>(
    () => ({ tables: new Set(deletable), start, onSettled: subscribe }),
    [deletable, start, subscribe]
  );
  const jobsApi = useMemo<BackgroundJobsApi>(
    () => ({ jobs, cancel, dismiss, clearFinished }),
    [jobs, cancel, dismiss, clearFinished]
  );

  return (
    <BackgroundJobsContext.Provider value={jobsApi}>
      <TableBulkDeleteProvider value={tableApi}>{children}</TableBulkDeleteProvider>
    </BackgroundJobsContext.Provider>
  );
}
