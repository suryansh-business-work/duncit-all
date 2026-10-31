import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { testsLog } from '../../lib/logger';
import { LiveRunsContext } from './context';
import { TESTS_LIVE_RUNS, type TestsLiveRunsData } from './queries';

/** How often the list refreshes while something is running. The bars move every second between reads. */
const LIVE_POLL_MS = 15_000;
/** How often an idle console looks for a run that has just started. */
const IDLE_POLL_MS = 30_000;

const NO_RUNS: TestsLiveRunsData['testsLiveRuns']['runs'] = [];

/**
 * The one reader of `testsLiveRuns` for the whole console. Mounted once in the
 * shell, so the strip above every page and the chips inside every table share
 * one poll instead of each starting its own.
 */
export default function LiveRunsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const { data, error, startPolling, stopPolling } = useQuery<TestsLiveRunsData>(TESTS_LIVE_RUNS, {
    fetchPolicy: 'cache-and-network',
  });
  const runs = data?.testsLiveRuns.runs ?? NO_RUNS;
  const serverNow = data?.testsLiveRuns.server_now;
  const busy = runs.length > 0;

  useEffect(() => {
    startPolling(busy ? LIVE_POLL_MS : IDLE_POLL_MS);
    return () => stopPolling();
  }, [busy, startPolling, stopPolling]);

  useEffect(() => {
    if (serverNow) setClockOffsetMs(Date.parse(serverNow) - Date.now());
  }, [serverNow]);

  // A failed read keeps the last answer on screen and the next poll tries
  // again; the page itself is not about this list, so it gets no banner.
  useEffect(() => {
    if (error) testsLog.warn('*', 'LiveRunsProvider', { error });
  }, [error]);

  const value = useMemo(() => ({ runs, clockOffsetMs }), [runs, clockOffsetMs]);
  return <LiveRunsContext.Provider value={value}>{children}</LiveRunsContext.Provider>;
}
