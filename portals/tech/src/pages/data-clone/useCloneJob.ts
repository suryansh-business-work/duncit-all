import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { DATA_CLONE_JOB, type CloneJob } from './queries';

/** Poll cadence while a job runs. */
const POLL_MS = 2000;

/**
 * The latest clone job, polled only while it is actually running.
 *
 * The poll flag is state rather than a value derived inline, because the
 * interval depends on the query's own result — reading it back into the same
 * useQuery call would be circular, and toggling Apollo's polling during render
 * would be a side effect in render.
 */
export function useCloneJob() {
  const [polling, setPolling] = useState(false);
  const { data, loading, refetch } = useQuery<{ dataCloneJob: CloneJob | null }>(DATA_CLONE_JOB, {
    fetchPolicy: 'network-only',
    pollInterval: polling ? POLL_MS : 0,
  });

  const job = data?.dataCloneJob ?? null;
  const running = job?.status === 'RUNNING';

  useEffect(() => {
    setPolling(!!running);
  }, [running]);

  return { job, running: !!running, loading: loading && !data, refetch };
}
