import { Types } from 'mongoose';
import { BackgroundJobModel, type JobActor, type JobRowFailure, type LeanBackgroundJob } from '@modules/platform/backgroundJob/backgroundJob.model';
import { leadModel } from './leadQuality.lead';
import type { ScoreTrigger } from './leadQuality.model';
import type { QualityLeadType } from './leadQuality.rules';
import { leadQualityService } from './leadQuality.service';
import type { QualityActor } from './leadQualityConfig.service';

/**
 * One step of a LEAD_QUALITY_RECALC background job: score the next batch of
 * leads. Kept apart from the starter (leadQuality.recalc.ts) because the job
 * runner imports every step, and the starter imports the runner.
 */

export interface RecalcParams {
  entity_type: QualityLeadType;
  trigger: ScoreTrigger;
  external: boolean;
  /** Only leads with no score yet (the boot backfill). */
  only_unscored: boolean;
}

/** External checks call Instagram / Google, so those jobs go a few leads at a time. */
const BATCH = 25;
const EXTERNAL_BATCH = 5;
const FAILURES_KEPT = 20;

export const SYSTEM_JOB_ACTOR: JobActor = { id: 'SYSTEM', email: '', roles: [] };

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function scopeFilter(params: RecalcParams, ids: readonly string[]): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (ids.length > 0) filter._id = { $in: ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)) };
  if (params.only_unscored) filter.quality = { $exists: false };
  return filter;
}

/** Score the next batch. False when the scope is done. */
export async function recalcLeadQualityStep(job: LeanBackgroundJob): Promise<boolean> {
  const params = job.params as unknown as RecalcParams;
  const filter = scopeFilter(params, job.ids);
  const idRange: Record<string, unknown> = { ...((filter._id as Record<string, unknown> | undefined) ?? {}) };
  if (job.cursor) idRange.$gt = job.cursor;
  if (job.max_id) idRange.$lte = job.max_id;
  if (Object.keys(idRange).length > 0) filter._id = idRange;
  const size = params.external ? EXTERNAL_BATCH : BATCH;
  const leads = await leadModel(params.entity_type).find(filter, '_id').sort({ _id: 1 }).limit(size).lean();
  if (leads.length === 0) return false;
  const actor: QualityActor = { id: job.actor.id === SYSTEM_JOB_ACTOR.id ? null : job.actor.id, name: job.actor.email };
  const failures: JobRowFailure[] = [];
  for (const lead of leads) {
    try {
      await leadQualityService.score(params.entity_type, String(lead._id), { trigger: params.trigger, actor, external: params.external });
    } catch (error) {
      failures.push({ id: String(lead._id), message: messageOf(error).slice(0, 300) });
    }
  }
  await BackgroundJobModel.updateOne(
    { _id: job._id },
    {
      $inc: { succeeded: leads.length - failures.length, failed: failures.length },
      $set: { cursor: leads.at(-1)?._id ?? job.cursor },
      $push: { failures: { $each: failures, $slice: FAILURES_KEPT } },
    }
  );
  return leads.length === size;
}
