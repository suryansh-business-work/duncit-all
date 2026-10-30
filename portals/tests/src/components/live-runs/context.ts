import { createContext } from 'react';
import type { TestsLiveRun } from './queries';

export interface LiveRunsValue {
  runs: readonly TestsLiveRun[];
  /** Server time minus this browser's time, so elapsed time does not trust the viewer's clock. */
  clockOffsetMs: number;
}

/** Empty outside the provider: every live-progress view then simply draws nothing. */
export const LiveRunsContext = createContext<LiveRunsValue>({ runs: [], clockOffsetMs: 0 });
