import { logs } from '@observability/log';
import { isSchedulerLeader } from '@utils/schedulerLeader';

export interface ClusterJob {
  /** Log component, e.g. `coin-expiry` — kept as each scheduler logged before. */
  component: string;
  /** Log operation for a failed run, e.g. `sweep`. */
  operation: string;
  firstDelayMs: number;
  intervalMs: number;
  run: () => Promise<unknown>;
}

/**
 * A background job that must run once across the cluster, not once per process.
 *
 * The loop every scheduler used to write for itself, in one place: a first run
 * after `firstDelayMs`, then every `intervalMs`; never two runs of the same job
 * overlapping in this process; only on the scheduler leader (schedulerLeader.ts);
 * a failed run logged and the interval kept; timers that never hold the process
 * open. Returns a stop function.
 *
 * No-ops under NODE_ENV=test, so a suite that imports a scheduler can never
 * start one for real (several post to WhatsApp, Razorpay or the app stores).
 */
export function startClusterJob(job: ClusterJob): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  let running = false;
  const tick = () => {
    if (running || !isSchedulerLeader()) return;
    running = true;
    job
      .run()
      .catch((error) => {
        logs.server.error(job.component, job.operation, { error, msg: `${job.operation} failed` });
      })
      .finally(() => {
        running = false;
      });
  };
  const first = setTimeout(tick, job.firstDelayMs);
  const interval = setInterval(tick, job.intervalMs);
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
