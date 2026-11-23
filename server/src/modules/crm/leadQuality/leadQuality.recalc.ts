import { requestIdentity } from '@observability/requestIdentity';
import { BackgroundJobModel, type JobActor } from '@modules/platform/backgroundJob/backgroundJob.model';
import { scheduleJob } from '@modules/platform/backgroundJob/backgroundJob.runner';
import { LEAD_LABELS } from '@modules/crm/crm/leadModels';
import { leadModel } from './leadQuality.lead';
import type { ScoreTrigger } from './leadQuality.model';
import type { QualityLeadType } from './leadQuality.rules';
import { scopeFilter, SYSTEM_JOB_ACTOR, type RecalcParams } from './leadQuality.recalcStep';

export { SYSTEM_JOB_ACTOR } from './leadQuality.recalcStep';

/**
 * Bulk recalculation as a background job (kind LEAD_QUALITY_RECALC): after a
 * configuration is published, when an admin asks for it, and at boot for
 * leads that have never been scored. It runs on the shared job runner, so it
 * shows in the starter's jobs drawer, survives a restart and can be cancelled.
 */

export interface StartRecalcInput {
  entity_type: QualityLeadType;
  trigger: ScoreTrigger;
  external?: boolean;
  only_unscored?: boolean;
  ids?: readonly string[];
}

/** Size the scope, record the job and hand it to the runner. Null when there is nothing to score. */
export async function startRecalc(actor: JobActor, input: StartRecalcInput): Promise<{ job_id: string; total: number } | null> {
  const params: RecalcParams = {
    entity_type: input.entity_type,
    trigger: input.trigger,
    external: input.external === true,
    only_unscored: input.only_unscored === true,
  };
  const ids = [...(input.ids ?? [])];
  const filter = scopeFilter(params, ids);
  const model = leadModel(input.entity_type);
  const [total, newest] = await Promise.all([model.countDocuments(filter), model.find(filter, '_id').sort({ _id: -1 }).limit(1).lean()]);
  const [newestRow] = newest;
  if (total === 0 || !newestRow) return null;
  const job = await BackgroundJobModel.create({
    kind: 'LEAD_QUALITY_RECALC',
    label: `${LEAD_LABELS[input.entity_type]} quality scores`,
    url: '',
    params,
    ids,
    total,
    max_id: newestRow._id,
    actor,
    identity: requestIdentity.current() ?? { user: actor.id === SYSTEM_JOB_ACTOR.id ? undefined : actor },
  });
  scheduleJob(String(job._id));
  return { job_id: String(job._id), total };
}

/** A recalculation of this lead type is already running (boot must not start a second). */
export async function recalcRunning(entity_type: QualityLeadType): Promise<boolean> {
  return (await BackgroundJobModel.exists({ kind: 'LEAD_QUALITY_RECALC', status: 'RUNNING', 'params.entity_type': entity_type })) !== null;
}
