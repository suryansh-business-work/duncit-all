import { useEffect, useRef } from 'react';
import { useBackgroundJobs } from '@duncit/shell';

/**
 * Calls `onSettled` whenever one of the signed-in person's AI translation runs
 * stops running — the moment the coverage numbers and the namespace counts on
 * screen go stale.
 *
 * The runs are the shell's background jobs (the header's progress ring polls
 * them), so this only watches the count the shell already has.
 */
export function useAiRunsSettled(onSettled: () => void): void {
  const jobs = useBackgroundJobs()?.jobs;
  const running = (jobs ?? []).filter((job) => job.kind === 'AI_TRANSLATE' && job.status === 'RUNNING').length;
  const previous = useRef(running);
  const latest = useRef(onSettled);
  latest.current = onSettled;

  useEffect(() => {
    if (running < previous.current) latest.current();
    previous.current = running;
  }, [running]);
}
