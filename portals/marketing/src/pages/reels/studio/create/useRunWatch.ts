import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { MARKETING_RUN, type MarketingRunDetail, type MarketingRunStatus } from '../../../activity-page/queries';

/** How often a run in flight is read again. */
export const RUN_POLL_MS = 2000;

/** Statuses a run can still move on from. */
const ACTIVE: ReadonlySet<MarketingRunStatus> = new Set(['PENDING', 'RUNNING', 'AWAITING_APPROVAL']);

/** What a run that did not complete says went wrong: its own error, else its first failed step's. */
export function runFailure(run: Pick<MarketingRunDetail, 'status' | 'error' | 'steps'> | null): string {
  if (!run || (run.status !== 'FAILED' && run.status !== 'PARTIAL' && run.status !== 'CANCELLED')) return '';
  return run.error || run.steps.find((step) => step.error !== '')?.error || '';
}

/**
 * A marketing run, followed while it runs: the drawer's own query, polled
 * every two seconds until the run reaches a final status, then left alone.
 * The run is the server's record of what a Create step did, so its steps are
 * the honest progress bar — and its error is the honest failure message.
 */
export function useRunWatch(runId: string | null) {
  const [active, setActive] = useState(false);
  const { data, loading, error } = useQuery<{ marketingRun: MarketingRunDetail | null }>(MARKETING_RUN, {
    variables: { id: runId ?? '' },
    skip: runId === null,
    fetchPolicy: 'network-only',
    pollInterval: active ? RUN_POLL_MS : 0,
  });
  const run = data?.marketingRun ?? null;
  // Only the run asked for: the cache may still hold the previous one for a beat.
  const current = run?.id === runId ? run : null;

  useEffect(() => {
    setActive(runId !== null && (current === null || ACTIVE.has(current.status)));
  }, [current, runId]);

  return { run: current, loading, error, active, failure: runFailure(current) };
}

export type RunWatch = ReturnType<typeof useRunWatch>;
