import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { logs } from '@observability/log';
import { translateNextWave } from '@modules/platform/localization/aiTranslate.step';
import { deleteBatch } from './bulkDelete.runner';
import {
  BackgroundJobModel,
  type BackgroundJobKind,
  type BackgroundJobStatus,
  type LeanBackgroundJob,
} from './backgroundJob.model';

/**
 * Works every background job off one step at a time, whatever its kind.
 *
 * A step does one small unit of the job (a batch of deletes, a wave of
 * translations), writes its counts and `cursor`, and says whether there is
 * more. The next step is scheduled with `setImmediate`, so a job of thousands
 * of rows never holds the event loop and a restart loses at most the step in
 * hand.
 *
 * A lease keeps two server processes (a deploy's old and new containers) from
 * working one job at once. A process that finds the lease taken waits it out
 * and tries again, which is how a job survives the process that held it dying.
 */

/** Long enough for the slowest step; how long a takeover waits. */
const LEASE_MS = 2 * 60_000;
const OWNER = `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;

/** One unit of work for a kind. False when nothing is left to do. */
type JobStep = (job: LeanBackgroundJob) => Promise<boolean>;

const STEPS: Readonly<Record<BackgroundJobKind, JobStep>> = {
  BULK_DELETE: deleteBatch,
  AI_TRANSLATE: translateNextWave,
};

const scheduled = new Set<string>();

type StepResult = 'MORE' | 'WAIT' | 'DONE';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function claim(id: string): Promise<LeanBackgroundJob | null> {
  const now = new Date();
  return BackgroundJobModel.findOneAndUpdate(
    {
      _id: id,
      status: 'RUNNING',
      $or: [{ lease_owner: OWNER }, { lease_until: null }, { lease_until: { $lt: now } }],
    },
    { $set: { lease_owner: OWNER, lease_until: new Date(now.getTime() + LEASE_MS) } },
    { new: true }
  ).lean<LeanBackgroundJob>();
}

async function finish(id: string, status: BackgroundJobStatus, message: string): Promise<void> {
  await BackgroundJobModel.updateOne(
    { _id: id, status: 'RUNNING' },
    { $set: { status, error_message: message, finished_at: new Date(), lease_until: null } }
  );
}

async function step(id: string): Promise<StepResult> {
  const job = await claim(id);
  if (!job) {
    const running = await BackgroundJobModel.exists({ _id: id, status: 'RUNNING' });
    return running ? 'WAIT' : 'DONE';
  }
  try {
    if (await STEPS[job.kind](job)) return 'MORE';
    await finish(id, 'COMPLETED', '');
  } catch (error) {
    logs.server.error('backgroundJob', 'step', { error, job_id: id, kind: job.kind });
    await finish(id, 'FAILED', messageOf(error));
  }
  return 'DONE';
}

function loop(id: string): void {
  step(id)
    .then((result) => {
      if (result === 'MORE') globalThis.setImmediate(() => loop(id));
      else if (result === 'WAIT') globalThis.setTimeout(() => loop(id), LEASE_MS);
      else scheduled.delete(id);
    })
    .catch((error: unknown) => {
      scheduled.delete(id);
      logs.server.error('backgroundJob', 'loop', { error, job_id: id });
    });
}

/** Start working a job in this process, unless it already is. */
export function scheduleJob(id: string): void {
  if (scheduled.has(id)) return;
  scheduled.add(id);
  globalThis.setImmediate(() => loop(id));
}

/** Pick up every job a previous process left RUNNING. Called once at boot. */
export async function resumeBackgroundJobs(): Promise<void> {
  const ids: unknown[] = await BackgroundJobModel.find({ status: 'RUNNING' }).distinct('_id');
  for (const id of ids) scheduleJob(String(id));
}
