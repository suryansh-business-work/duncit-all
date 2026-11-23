import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import type { MutationCancelCrmLeadDiscoveryArgs, MutationRetryCrmLeadDiscoveryArgs, QueryCrmLeadDiscoveryJobsArgs } from '@duncit/gql-types';
import { useTranslation } from '@duncit/shell';
import {
  CANCEL_LEAD_DISCOVERY,
  LEAD_DISCOVERY_JOBS,
  RETRY_LEAD_DISCOVERY,
  type LeadDiscoveryJob,
} from '../../api/leadResearch.gql';
import { discoveryErrorMessage } from './discoveryErrors';

/** How many recent discoveries the panel lists. */
export const JOBS_LIMIT = 20;
/** How often the list reloads while a discovery is running. */
export const JOBS_POLL_MS = 10_000;

/** After a new discovery starts: the list, and the header's background-jobs drawer. */
export const JOBS_REFETCH = [{ query: LEAD_DISCOVERY_JOBS, variables: { limit: JOBS_LIMIT } }, 'MyBackgroundJobs'];

type JobsData = { crmLeadDiscoveryJobs: LeadDiscoveryJob[] };
type JobData<K extends string> = Record<K, LeadDiscoveryJob>;

export interface JobActionError {
  jobId: string;
  message: string;
}

/**
 * Recent discoveries, reloaded every 10 s while any is running, with Cancel
 * (the starter only — the server refuses anyone else) and Retry (a finished
 * one, run again as a new discovery). An action's error is kept against the job
 * it was for.
 */
export function useDiscoveryJobs() {
  const { t } = useTranslation();
  const query = useQuery<JobsData, QueryCrmLeadDiscoveryJobsArgs>(LEAD_DISCOVERY_JOBS, { variables: { limit: JOBS_LIMIT } });
  const jobs = query.data?.crmLeadDiscoveryJobs ?? [];
  const running = jobs.some((job) => job.status === 'RUNNING');
  const { startPolling, stopPolling } = query;

  useEffect(() => {
    if (!running) return undefined;
    startPolling(JOBS_POLL_MS);
    return () => stopPolling();
  }, [running, startPolling, stopPolling]);

  const [cancelMutation] = useMutation<JobData<'cancelCrmLeadDiscovery'>, MutationCancelCrmLeadDiscoveryArgs>(CANCEL_LEAD_DISCOVERY, {
    refetchQueries: ['MyBackgroundJobs'],
  });
  const [retryMutation] = useMutation<JobData<'retryCrmLeadDiscovery'>, MutationRetryCrmLeadDiscoveryArgs>(RETRY_LEAD_DISCOVERY, {
    refetchQueries: JOBS_REFETCH,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<JobActionError | null>(null);

  const guard = async (jobId: string, action: () => Promise<unknown>) => {
    setBusyId(jobId);
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError({ jobId, message: discoveryErrorMessage(error, t) });
    } finally {
      setBusyId(null);
    }
  };

  return {
    jobs,
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
    busyId,
    actionError,
    cancel: (jobId: string) => guard(jobId, () => cancelMutation({ variables: { id: jobId } })),
    retry: (jobId: string) => guard(jobId, () => retryMutation({ variables: { id: jobId } })),
  };
}
