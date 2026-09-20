import { logs } from '@observability/log';
import { AutomationRunModel } from './automation.model';
import { resumeDelay, resumeTimeout } from './automation.engine';

/**
 * The clock behind the two kinds of pause.
 *
 * A delay step parks the run with `resume_at`; a wait-for-reply step parks it
 * with `wait_until`. Nothing else ever moves those runs — an incoming reply is
 * the only other event, and it goes through `automation.inbound`. So this
 * sweep is the whole of "time passing" for automation, and like every other
 * sweep in this server it assumes ONE replica (see whatsapp.scheduler.ts).
 */

const TICK_MS = 60_000;
const FIRST_TICK_DELAY_MS = 45_000;
/** Runs woken per tick. The rest wait a minute — a stampede after downtime
 * would otherwise hit AiSensy and OpenAI all at once. */
const BATCH = 50;

export async function runAutomationSweep(): Promise<void> {
  const now = new Date();
  const due = await AutomationRunModel.find({ status: 'WAITING_DELAY', resume_at: { $lte: now } })
    .sort({ resume_at: 1 })
    .limit(BATCH);
  for (const run of due) {
    await resumeDelay(run).catch((error) => logs.server.error('automation', 'resumeDelay', { error, run_id: String(run._id) }));
  }

  const expired = await AutomationRunModel.find({ status: 'WAITING_REPLY', wait_until: { $lte: now } })
    .sort({ wait_until: 1 })
    .limit(BATCH);
  for (const run of expired) {
    await resumeTimeout(run).catch((error) => logs.server.error('automation', 'resumeTimeout', { error, run_id: String(run._id) }));
  }
}

export function startAutomationScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runAutomationSweep();
    } catch (error) {
      logs.server.error('automation', 'sweep', { error });
    } finally {
      running = false;
    }
  };
  const first = setTimeout(() => {
    tick().catch(() => undefined);
  }, FIRST_TICK_DELAY_MS);
  const interval = setInterval(() => {
    tick().catch(() => undefined);
  }, TICK_MS);
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
