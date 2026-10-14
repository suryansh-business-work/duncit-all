import { BackgroundJobModel, type JobRowFailure, type LeanBackgroundJob } from '@modules/platform/backgroundJob/backgroundJob.model';
import { checkAndRecord } from './emailVerification.check';

/** What an EMAIL_VERIFY job row carries in `params`. */
export interface EmailVerifyParams {
  emails: string[];
}

/**
 * Addresses checked at once. Each one is a live SMTP conversation (up to the
 * container's timeout), so a wave stays well inside the runner's 2-minute lease
 * and mail servers are not hit with a burst from one IP.
 */
const WAVE_SIZE = 5;
const FAILURES_KEPT = 20;

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Check the next wave of the uploaded addresses. False when the list is done. */
export async function verifyEmailWave(job: LeanBackgroundJob): Promise<boolean> {
  const { emails } = job.params as unknown as EmailVerifyParams;
  const start = typeof job.cursor === 'number' ? job.cursor : 0;
  const wave = emails.slice(start, start + WAVE_SIZE);
  if (wave.length === 0) return false;

  const actor = { id: job.actor.id, email: job.actor.email };
  const results = await Promise.allSettled(
    wave.map((email) => checkAndRecord(email, actor, 'BULK', String(job._id)))
  );
  const failures: JobRowFailure[] = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') failures.push({ id: wave[index], message: messageOf(result.reason) });
  });
  // Every address failing means the verifier is down, not the emails bad — stop
  // rather than burn through the whole file recording nothing.
  if (failures.length === wave.length) throw new Error(failures[0].message);

  await BackgroundJobModel.updateOne(
    { _id: job._id },
    {
      $inc: { succeeded: wave.length - failures.length, failed: failures.length },
      $set: { cursor: start + wave.length },
      $push: { failures: { $each: failures, $slice: FAILURES_KEPT } },
    }
  );
  return start + wave.length < emails.length;
}
