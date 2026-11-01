import { logs } from '@observability/log';
import { appDateTime, appFormat } from '@utils/app-time';
import { startClusterJob } from '@utils/clusterJob';
import { MarketingLeadModel, type MarketingLeadDoc } from '../leads/marketingLead.model';
import { timelineEntry } from '../leads/marketingLead.service';
import { SYSTEM_LEAD_ACTOR } from '../leads/marketingLead.types';
import { beginRun, finishRun, recordStep, startRun, statusFromSteps } from '../runs/marketingRun.service';
import { MarketingRunModel } from '../runs/marketingRun.model';
import {
  OutreachEnrollmentModel,
  OutreachSendModel,
  OutreachSequenceModel,
  OutreachTaskModel,
  type OutreachEnrollmentDoc,
  type OutreachSequenceDoc,
  type OutreachStepDoc,
} from './outreach.model';
import { precheck, sendEmailStep, sendWhatsappStep, type StepOutcome } from './outreach.send';
import { sentToday } from './outreach.service';
import { fillVars, nextReachingStep } from './outreach.validate';

/**
 * The clock behind every sequence. Each tick takes the enrollments that are
 * due, sequence by sequence, outside quiet hours and within the day's limit,
 * and records the tick as one OUTREACH run with a step per send.
 *
 * A send happens once per (enrollment, step): it is claimed by inserting its
 * OutreachSend row under a unique index BEFORE anything leaves, so a second
 * tick (or a second replica) that reaches the same step fails the insert and
 * moves on.
 */
const DAY_MS = 86_400_000;
const TICK_MS = 5 * 60_000;
const FIRST_TICK_DELAY_MS = 90_000;
const STOP_STAGES = new Set(['REPLIED', 'QUALIFIED']);
const DONE_STAGES = new Set(['CONVERTED', 'LOST']);

const entry = (kind: string, text: string, step_index = -1) => ({ at: new Date(), kind, text: text.slice(0, 300), step_index });

/** Whether `now`, on the admin's clock, falls in the sequence's quiet window. Equal hours mean no window. */
export function inQuietHours(seq: Pick<OutreachSequenceDoc, 'quiet_start_hour' | 'quiet_end_hour'>, now = new Date()): boolean {
  const start = seq.quiet_start_hour;
  const end = seq.quiet_end_hour;
  if (start === end) return false;
  const hour = Number(appFormat(now, 'H'));
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** Stop an enrollment for good (a reply, an opt-out, the lead closed) and cancel any DM it was waiting on. */
export async function stopEnrollment(enrollment: Pick<OutreachEnrollmentDoc, '_id'>, status: 'REPLIED' | 'OPTED_OUT' | 'DONE', text: string): Promise<void> {
  await OutreachEnrollmentModel.updateOne(
    { _id: enrollment._id, status: { $in: ['ACTIVE', 'PAUSED', 'FAILED'] } },
    { $set: { status, next_at: null, waiting_task_id: '' }, $push: { history: entry(status, text) } }
  );
  await OutreachTaskModel.updateMany({ enrollment_id: enrollment._id, status: 'OPEN' }, { $set: { status: 'CANCELLED' } });
}

/** A first message moves a NEW lead to CONTACTED; every send is on the lead's history. */
async function noteOnLead(lead: MarketingLeadDoc, text: string): Promise<void> {
  const push = [timelineEntry('OUTREACH', text, SYSTEM_LEAD_ACTOR)];
  if (lead.stage === 'NEW') push.push(timelineEntry('STAGE', 'NEW → CONTACTED', SYSTEM_LEAD_ACTOR));
  await MarketingLeadModel.updateOne({ _id: lead._id }, { ...(lead.stage === 'NEW' ? { $set: { stage: 'CONTACTED' } } : {}), $push: { timeline: { $each: push } } });
}

async function makeTask(seq: OutreachSequenceDoc, enrollment: OutreachEnrollmentDoc, step: OutreachStepDoc, lead: MarketingLeadDoc): Promise<StepOutcome & { task_id: string }> {
  const task = await OutreachTaskModel.create({
    sequence_id: seq._id,
    enrollment_id: enrollment._id,
    lead_id: lead._id,
    step_index: enrollment.step_index,
    text: fillVars(step.body ?? '', lead),
    owner_user_id: lead.owner_user_id ?? null,
  });
  return { status: 'SENT', detail: 'DM task made for a person', destination: '', task_id: String(task._id) };
}

/** Walk the enrollment on after its step: to the next step that reaches the lead (past waits), or to DONE. */
function advance(seq: OutreachSequenceDoc, index: number) {
  const next = nextReachingStep(seq.steps ?? [], index + 1);
  if (next.index >= (seq.steps ?? []).length) return { status: 'DONE', next_at: null };
  return { step_index: next.index, next_at: new Date(Date.now() + next.days * DAY_MS) };
}

type Handled = 'sent' | 'none';

/** How a step outcome is kept on the send row: an opt-out or a deferral is a skip. */
const recordedStatus = (status: StepOutcome['status']): 'SENT' | 'SKIPPED' | 'FAILED' =>
  status === 'SENT' || status === 'FAILED' ? status : 'SKIPPED';

/** One due enrollment. Returns whether a send (or task) was used from the day's limit. */
export async function processEnrollment(seq: OutreachSequenceDoc, enrollment: OutreachEnrollmentDoc, ensureRun: () => Promise<string>): Promise<Handled> {
  const index = enrollment.step_index;
  const step = seq.steps?.[index];
  const lead = await MarketingLeadModel.findById(enrollment.lead_id).lean<MarketingLeadDoc>();
  if (!lead) {
    await OutreachEnrollmentModel.updateOne({ _id: enrollment._id }, { $set: { status: 'FAILED', error: 'The lead no longer exists', next_at: null } });
    return 'none';
  }
  if (!step) {
    await stopEnrollment(enrollment, 'DONE', 'Every step done');
    return 'none';
  }
  if (DONE_STAGES.has(lead.stage)) {
    await stopEnrollment(enrollment, 'DONE', `The lead is ${lead.stage}`);
    return 'none';
  }
  if (seq.stop_on_reply && STOP_STAGES.has(lead.stage)) {
    await stopEnrollment(enrollment, 'REPLIED', `The lead is ${lead.stage}`);
    return 'none';
  }
  const early = await precheck(step, lead);
  if (early?.status === 'OPTED_OUT') {
    await stopEnrollment(enrollment, 'OPTED_OUT', early.detail);
    return 'none';
  }
  if (early?.status === 'DEFER') {
    await OutreachEnrollmentModel.updateOne({ _id: enrollment._id, step_index: index }, { $set: { next_at: new Date(Date.now() + DAY_MS) } });
    return 'none';
  }

  const runId = await ensureRun();
  try {
    await OutreachSendModel.create({ sequence_id: seq._id, enrollment_id: enrollment._id, lead_id: lead._id, step_index: index, kind: step.kind, run_id: runId });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return 'none';
    throw error;
  }

  const stepKey = `${String(enrollment._id)}:${index}`;
  const label = `${step.kind} to ${lead.name} (step ${index + 1})`;
  await recordStep(runId, stepKey, { status: 'RUNNING', label, tool: `outreach.${step.kind.toLowerCase()}` });
  const started = Date.now();
  let outcome: StepOutcome & { task_id?: string };
  if (step.kind === 'EMAIL') outcome = await sendEmailStep(step, lead, String(seq._id));
  else if (step.kind === 'WHATSAPP') outcome = await sendWhatsappStep(step, lead, String(enrollment._id));
  else outcome = await makeTask(seq, enrollment, step, lead);

  const recorded = recordedStatus(outcome.status);
  await OutreachSendModel.updateOne(
    { enrollment_id: enrollment._id, step_index: index },
    // A DM task stays CLAIMED until a person marks it done; it still counts against the day.
    { $set: { status: outcome.task_id ? 'CLAIMED' : recorded, detail: outcome.detail, destination: outcome.destination, finished_at: outcome.task_id ? null : new Date() } }
  );
  await recordStep(runId, stepKey, {
    status: recorded === 'SENT' ? 'OK' : recorded,
    output_summary: outcome.detail,
    error: recorded === 'FAILED' ? outcome.detail : '',
    ms: Date.now() - started,
  });

  const guard = { _id: enrollment._id, step_index: index, status: 'ACTIVE' };
  if (outcome.status === 'OPTED_OUT') {
    await stopEnrollment(enrollment, 'OPTED_OUT', outcome.detail);
  } else if (outcome.status === 'FAILED') {
    await OutreachEnrollmentModel.updateOne(guard, { $set: { status: 'FAILED', error: outcome.detail, next_at: null }, $push: { history: entry('FAILED', outcome.detail, index) } });
  } else if (outcome.task_id) {
    await OutreachEnrollmentModel.updateOne(guard, { $set: { waiting_task_id: outcome.task_id, next_at: null }, $push: { history: entry('TASK', outcome.detail, index) } });
  } else {
    const next = advance(seq, index);
    const history = [entry(outcome.status, outcome.detail, index), ...(next.status === 'DONE' ? [entry('DONE', 'Every step done')] : [])];
    await OutreachEnrollmentModel.updateOne(guard, { $set: next, $push: { history: { $each: history } } });
  }
  if (outcome.status === 'SENT') await noteOnLead(lead, `${seq.name}: ${outcome.detail}`);
  return outcome.status === 'SENT' || outcome.task_id ? 'sent' : 'none';
}

/** One sequence's due enrollments, within what is left of its day. */
async function runSequence(seq: OutreachSequenceDoc, now: Date, ensureRun: () => Promise<string>): Promise<void> {
  if (inQuietHours(seq, now)) return;
  let left = seq.daily_limit - (await sentToday(seq._id, now));
  if (left <= 0) return;
  const due = await OutreachEnrollmentModel.find({ sequence_id: seq._id, status: 'ACTIVE', waiting_task_id: '', next_at: { $ne: null, $lte: now } })
    .sort({ next_at: 1 })
    .limit(left)
    .lean<OutreachEnrollmentDoc[]>();
  for (const enrollment of due) {
    if (left <= 0) break;
    const used = await processEnrollment(seq, enrollment, ensureRun).catch((error: unknown) => {
      logs.server.error('outreach', 'enrollment', { error, enrollment_id: String(enrollment._id) });
      return 'none' as const;
    });
    if (used === 'sent') left -= 1;
  }
}

/** One tick across every active sequence. A tick with nothing due records no run. */
export async function runOutreachTick(now = new Date()): Promise<string | null> {
  const sequences = await OutreachSequenceModel.find({ active: true }).lean<OutreachSequenceDoc[]>();
  let runId: string | null = null;
  const ensureRun = async () => {
    if (!runId) {
      runId = await startRun({ workflow: 'OUTREACH', name: `Outreach: ${appDateTime(now)}`, trigger: 'SCHEDULE' });
      await beginRun(runId);
    }
    return runId;
  };
  for (const seq of sequences) await runSequence(seq, now, ensureRun);
  if (runId) {
    const doc = await MarketingRunModel.findById(runId).select('steps').lean<{ steps: { status: string }[] }>();
    await finishRun(runId, statusFromSteps(doc?.steps ?? []));
  }
  return runId;
}

export function startOutreachScheduler(): () => void {
  return startClusterJob({ component: 'outreach', operation: 'tick', firstDelayMs: FIRST_TICK_DELAY_MS, intervalMs: TICK_MS, run: runOutreachTick });
}
