import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { TAB_PARAM } from '@duncit/tabs';

/** The query key holding the discovery the review queue is narrowed to. */
export const JOB_PARAM = 'job';

/** The Lead Research tabs, as the URL names them. */
export const RESEARCH_TAB = { queue: 'queue', discoveries: 'discoveries' } as const;
export type ResearchTab = (typeof RESEARCH_TAB)[keyof typeof RESEARCH_TAB];

/**
 * The discovery the review queue shows, kept in the URL beside the tab so a
 * reload or a shared link lands on the same view. Showing a job switches to the
 * queue tab in the same write — two writes would race and drop one of them.
 */
export function useJobFilter() {
  const [params, setParams] = useSearchParams();
  const jobId = params.get(JOB_PARAM) || null;

  const showJob = useCallback(
    (id: string) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set(JOB_PARAM, id);
          next.set(TAB_PARAM, RESEARCH_TAB.queue);
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  const clearJob = useCallback(
    () =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete(JOB_PARAM);
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  return { jobId, showJob, clearJob };
}
