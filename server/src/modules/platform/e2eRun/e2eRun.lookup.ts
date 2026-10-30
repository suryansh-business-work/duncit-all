import { E2eRunModel, type IE2eRun } from './e2eRun.model';

/** The two join keys every CI report carries. */
export interface E2eRunJoinKeys {
  dispatch_id?: string | null;
  workflow_run_id?: string | null;
}

const str = (v: string | null | undefined): string => String(v ?? '').trim();

/**
 * The row this report belongs to.
 *
 * Two join keys, checked in this order because they become available in this
 * order. A dispatched run has a row BEFORE it has a run id — the dispatch
 * answers 204 with nothing in it — so `dispatch_id` is the only thing that can
 * claim it on the first report. Everything after that joins on the run.
 */
export async function openRowFor(input: E2eRunJoinKeys): Promise<IE2eRun | null> {
  const dispatchId = str(input.dispatch_id);
  if (dispatchId) {
    const claimed = await E2eRunModel.findOne({ dispatch_id: dispatchId });
    if (claimed) return claimed;
  }
  const runId = str(input.workflow_run_id);
  // A hand-made report has no run id, and every one of those would otherwise
  // look like the same run and overwrite the last.
  if (!runId) return null;
  return E2eRunModel.findOne({ workflow_run_id: runId });
}
