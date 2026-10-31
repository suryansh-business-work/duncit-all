import { useContext, useEffect, useState } from 'react';
import { LiveRunsContext } from './context';
import { runProgress, type RunProgress } from './progress';
import type { TestsLiveRun, TestsLiveRunKind } from './queries';

/** How often a moving bar is redrawn. */
const TICK_MS = 1_000;

/** The server's "now", ticking every second while `active` — and not at all otherwise. */
function useServerNow(active: boolean, offsetMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const tick = () => setNow(Date.now());
    tick();
    const timer = globalThis.setInterval(tick, TICK_MS);
    return () => globalThis.clearInterval(timer);
  }, [active]);
  return now + offsetMs;
}

export interface LiveRunState {
  run: TestsLiveRun;
  progress: RunProgress;
}

/** Progress for one run, or null when it is not live (or `runId` is null). */
export function useLiveRun(kind: TestsLiveRunKind, runId: string | null): LiveRunState | null {
  const { runs, clockOffsetMs } = useContext(LiveRunsContext);
  const run = runId ? (runs.find((r) => r.kind === kind && r.run_id === runId) ?? null) : null;
  const now = useServerNow(run?.status === 'RUNNING', clockOffsetMs);
  return run ? { run, progress: runProgress(run, now) } : null;
}

/** Every live run, for the strip. */
export function useLiveRuns(): readonly TestsLiveRun[] {
  return useContext(LiveRunsContext).runs;
}
