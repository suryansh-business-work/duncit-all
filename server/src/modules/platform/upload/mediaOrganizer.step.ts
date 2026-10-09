import { BackgroundJobModel, type LeanBackgroundJob } from '@modules/platform/backgroundJob/backgroundJob.model';
import { MEDIA_ORGANIZE_PHASES, type MediaOrganizeParams } from './mediaOrganizer.params';
import { scanBatch } from './mediaOrganizer.scan';
import { applyBatch, rollbackBatch } from './mediaOrganizer.apply';
import { MEDIA_OWNERS } from './mediaOrganizer.registry';
import { MediaRelocationModel } from './mediaRelocation.model';

/**
 * One MEDIA_ORGANIZE step for the background runner.
 *
 * SCAN walks the owner collections one batch at a time (`cursor` is the last
 * `_id` read, `owner_index` the collection). A dry run stops there, with every
 * finding recorded. Otherwise the job turns into APPLY: its progress resets to
 * the files to copy, and each step copies a few. ROLLBACK is its own job,
 * started against a finished run.
 *
 * Every step writes its progress before returning, so a restart resumes with
 * the batch after the last one recorded — and every batch is safe to repeat.
 */

const isParams = (value: unknown): value is MediaOrganizeParams =>
  !!value && typeof value === 'object' && MEDIA_ORGANIZE_PHASES.includes((value as MediaOrganizeParams).phase);

async function scanStep(job: LeanBackgroundJob, params: MediaOrganizeParams): Promise<boolean> {
  if (params.owner_index >= MEDIA_OWNERS.length) {
    if (params.dry_run) return false;
    const pending = await MediaRelocationModel.countDocuments({ run_id: params.run_id, status: 'PENDING' });
    await BackgroundJobModel.updateOne(
      { _id: job._id },
      { $set: { 'params.phase': 'APPLY', total: pending, succeeded: 0, failed: 0, cursor: null } }
    );
    return pending > 0;
  }
  const { read, cursor } = await scanBatch(params.run_id, params.endpoint, params.owner_index, job.cursor);
  await BackgroundJobModel.updateOne(
    { _id: job._id },
    {
      $set: { cursor, 'params.owner_index': cursor ? params.owner_index : params.owner_index + 1 },
      $inc: { succeeded: read },
    }
  );
  return true;
}

async function applyStep(job: LeanBackgroundJob, params: MediaOrganizeParams): Promise<boolean> {
  const { done, failed, more } = await applyBatch(params.run_id, params.endpoint);
  await BackgroundJobModel.updateOne({ _id: job._id }, { $inc: { succeeded: done, failed } });
  return more;
}

async function rollbackStep(job: LeanBackgroundJob, params: MediaOrganizeParams): Promise<boolean> {
  const { done, more } = await rollbackBatch(params.run_id);
  await BackgroundJobModel.updateOne({ _id: job._id }, { $inc: { succeeded: done } });
  return more;
}

export async function organizeMediaStep(job: LeanBackgroundJob): Promise<boolean> {
  const params = job.params;
  if (!isParams(params)) throw new Error('This media organizer job is missing its settings.');
  if (params.phase === 'SCAN') return scanStep(job, params);
  if (params.phase === 'APPLY') return applyStep(job, params);
  return rollbackStep(job, params);
}
