import { isValidObjectId, type Types } from 'mongoose';
import { fromZonedTime } from 'date-fns-tz';
import { appFormat, getAppTimeZone } from '@utils/app-time';
import { escapedSearchRegex, runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { MarketingLeadModel, type MarketingLeadDoc } from '../leads/marketingLead.model';
import { ownerNamesOf } from '../userNames';
import {
  OutreachEnrollmentModel,
  OutreachSendModel,
  OutreachSequenceModel,
  OutreachTaskModel,
  type OutreachEnrollmentDoc,
  type OutreachSequenceDoc,
  type OutreachTaskDoc,
} from './outreach.model';
import { cleanSequence, nextReachingStep, refuse } from './outreach.validate';
import { OUTREACH_LIMITS, type OutreachLeadFilter, type OutreachSequenceInput } from './outreach.types';

/**
 * Sequences, the leads walking them, and the DM tasks they leave for a
 * person. Sending lives in outreach.runner; this is what the page reads and
 * the actions a person takes.
 */
const DAY_MS = 86_400_000;
const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);
const id = (value: unknown) => String(value);

/** Midnight today in the admin's zone — the daily limit resets then. */
export function startOfAppDay(now = new Date()): Date {
  return fromZonedTime(`${appFormat(now, 'yyyy-MM-dd')}T00:00:00`, getAppTimeZone());
}

/** Sends and DM tasks this sequence made today: every claim that did not come back skipped or failed. */
export const sentToday = (sequenceId: Types.ObjectId | string, now = new Date()) =>
  OutreachSendModel.countDocuments({ sequence_id: sequenceId, status: { $in: ['CLAIMED', 'SENT'] }, claimed_at: { $gte: startOfAppDay(now) } });

async function countsFor(sequenceId: Types.ObjectId) {
  const rows = await OutreachEnrollmentModel.aggregate<{ _id: string; n: number }>([
    { $match: { sequence_id: sequenceId } },
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  const by = new Map(rows.map((row) => [row._id, row.n]));
  return {
    total: rows.reduce((sum, row) => sum + row.n, 0),
    active: by.get('ACTIVE') ?? 0,
    paused: by.get('PAUSED') ?? 0,
    replied: by.get('REPLIED') ?? 0,
    opted_out: by.get('OPTED_OUT') ?? 0,
    done: by.get('DONE') ?? 0,
    failed: by.get('FAILED') ?? 0,
  };
}

async function pubSequence(doc: OutreachSequenceDoc) {
  const [counts, sent] = await Promise.all([countsFor(doc._id), sentToday(doc._id)]);
  return {
    id: id(doc._id),
    name: doc.name,
    description: doc.description ?? '',
    pipeline: doc.pipeline ?? null,
    steps: (doc.steps ?? []).map((s) => ({
      kind: s.kind,
      wait_days: s.wait_days ?? 0,
      subject: s.subject ?? '',
      body: s.body ?? '',
      wa_template_key: s.wa_template_key ?? '',
      wa_params: s.wa_params ?? [],
    })),
    daily_limit: doc.daily_limit,
    quiet_start_hour: doc.quiet_start_hour,
    quiet_end_hour: doc.quiet_end_hour,
    stop_on_reply: doc.stop_on_reply,
    active: doc.active,
    counts,
    sent_today: sent,
    created_by: doc.created_by ?? '',
    updated_by: doc.updated_by ?? '',
    created_at: iso(doc.created_at),
    updated_at: iso(doc.updated_at),
  };
}

export async function loadSequence(sequenceId: string): Promise<OutreachSequenceDoc> {
  const doc = isValidObjectId(sequenceId) ? await OutreachSequenceModel.findById(sequenceId).lean<OutreachSequenceDoc>() : null;
  if (!doc) refuse('Sequence not found', 'NOT_FOUND');
  return doc;
}

async function loadEnrollment(enrollmentId: string): Promise<OutreachEnrollmentDoc> {
  const doc = isValidObjectId(enrollmentId) ? await OutreachEnrollmentModel.findById(enrollmentId).lean<OutreachEnrollmentDoc>() : null;
  if (!doc) refuse('Enrollment not found', 'NOT_FOUND');
  return doc;
}

const pubEnrollment = (doc: OutreachEnrollmentDoc, sequences: Map<string, OutreachSequenceDoc>) => {
  const seq = sequences.get(id(doc.sequence_id));
  return {
    id: id(doc._id),
    sequence_id: id(doc.sequence_id),
    sequence_name: seq?.name ?? '',
    lead_id: id(doc.lead_id),
    lead_name: doc.lead_name ?? '',
    lead_company: doc.lead_company ?? '',
    step_index: doc.step_index,
    step_count: seq?.steps?.length ?? 0,
    next_at: iso(doc.next_at),
    status: doc.status,
    error: doc.error ?? '',
    history: (doc.history ?? []).map((h) => ({ at: iso(h.at), kind: h.kind, step_index: h.step_index ?? -1, text: h.text ?? '' })),
    created_at: iso(doc.created_at),
    updated_at: iso(doc.updated_at),
  };
};

async function sequencesById(ids: readonly unknown[]) {
  const docs = await OutreachSequenceModel.find({ _id: { $in: [...new Set(ids.map(id))] } }).lean<OutreachSequenceDoc[]>();
  return new Map(docs.map((doc) => [id(doc._id), doc]));
}

async function publishEnrollment(enrollmentId: string) {
  const doc = await loadEnrollment(enrollmentId);
  return pubEnrollment(doc, await sequencesById([doc.sequence_id]));
}

const ENROLLMENT_TABLE: TableEntityConfig = {
  searchFields: ['lead_name', 'lead_company'],
  sortFields: { created_at: 'created_at', next_at: 'next_at', status: 'status', lead_name: 'lead_name' },
  filterFields: {
    sequence_id: { type: 'string' },
    lead_id: { type: 'string' },
    status: { type: 'enum' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** The open leads a filter (and the sequence's own pipeline) takes. Converted and lost leads are never enrolled. */
function leadQuery(seq: OutreachSequenceDoc, filter?: OutreachLeadFilter | null): Record<string, unknown> {
  const query: Record<string, unknown> = { stage: { $nin: ['CONVERTED', 'LOST'] } };
  if (seq.pipeline) query.pipeline = seq.pipeline;
  if (filter?.pipeline) {
    if (seq.pipeline && seq.pipeline !== filter.pipeline) return { _id: null };
    query.pipeline = filter.pipeline;
  }
  if (filter?.stage) {
    if (filter.stage === 'CONVERTED' || filter.stage === 'LOST') return { _id: null };
    query.stage = filter.stage;
  }
  const city = (filter?.city ?? '').trim();
  if (city) query.city = escapedSearchRegex(city);
  return query;
}

const historyEntry = (kind: string, text: string, step_index = -1) => ({ at: new Date(), kind, text: text.slice(0, 300), step_index });

export const outreachService = {
  async list() {
    const docs = await OutreachSequenceModel.find().sort({ created_at: -1 }).lean<OutreachSequenceDoc[]>();
    return Promise.all(docs.map(pubSequence));
  },

  async get(sequenceId: string) {
    return pubSequence(await loadSequence(sequenceId));
  },

  /** Create (no id) or edit. An editor may not change a sequence that is live — that is a manager's call. */
  async save(sequenceId: string | null | undefined, input: OutreachSequenceInput, user: { id: string }, manager: boolean) {
    const clean = await cleanSequence(input);
    if (!sequenceId) {
      const doc = await OutreachSequenceModel.create({ ...clean, active: false, created_by: user.id, updated_by: user.id });
      return outreachService.get(id(doc._id));
    }
    const existing = await loadSequence(sequenceId);
    if (existing.active && !manager) refuse('This sequence is live; only a manager can change it. Switch it off first.', 'FORBIDDEN');
    await OutreachSequenceModel.updateOne({ _id: existing._id }, { $set: { ...clean, updated_by: user.id } });
    return outreachService.get(sequenceId);
  },

  async setActive(sequenceId: string, active: boolean, user: { id: string }) {
    const doc = await loadSequence(sequenceId);
    // Switching on re-checks every step: a campaign deleted from Communications since the save must not go live.
    if (active) await cleanSequence({ ...doc, pipeline: doc.pipeline ?? null, steps: doc.steps as OutreachSequenceInput['steps'] });
    await OutreachSequenceModel.updateOne({ _id: doc._id }, { $set: { active, updated_by: user.id } });
    return outreachService.get(sequenceId);
  },

  async enrollCount(sequenceId: string, filter?: OutreachLeadFilter | null) {
    const seq = await loadSequence(sequenceId);
    const ids = await MarketingLeadModel.find(leadQuery(seq, filter)).select('_id').limit(OUTREACH_LIMITS.enroll.max).lean();
    if (ids.length === 0) return 0;
    const already = await OutreachEnrollmentModel.countDocuments({ sequence_id: seq._id, lead_id: { $in: ids.map((row) => row._id) } });
    return ids.length - already;
  },

  /**
   * Enroll the given leads, or every lead the filter matches. The unique
   * (sequence, lead) index is the guard: a lead already in is counted, not
   * enrolled again, however the two requests race.
   */
  async enroll(sequenceId: string, leadIds: readonly string[] | null | undefined, filter: OutreachLeadFilter | null | undefined, user: { id: string }) {
    const seq = await loadSequence(sequenceId);
    const given = (leadIds ?? []).filter((leadId) => isValidObjectId(leadId));
    if (!leadIds?.length && !filter) refuse('Pick the leads to enroll, or a filter.');
    if (given.length > OUTREACH_LIMITS.enroll.max) refuse(`Enroll at most ${OUTREACH_LIMITS.enroll.max} leads at once.`);
    const query = leadIds?.length ? { ...leadQuery(seq, filter), _id: { $in: given } } : leadQuery(seq, filter);
    const leads = await MarketingLeadModel.find(query).select('name company').limit(OUTREACH_LIMITS.enroll.max).lean<MarketingLeadDoc[]>();
    const first = nextReachingStep(seq.steps ?? [], 0);
    const nextAt = new Date(Date.now() + first.days * DAY_MS);
    let enrolled = 0;
    let already = 0;
    for (const lead of leads) {
      try {
        await OutreachEnrollmentModel.create({
          sequence_id: seq._id,
          lead_id: lead._id,
          lead_name: lead.name,
          lead_company: lead.company ?? '',
          step_index: first.index,
          next_at: nextAt,
          status: 'ACTIVE',
          enrolled_by: user.id,
          history: [historyEntry('ENROLLED', `Enrolled in ${seq.name}`)],
        });
        enrolled += 1;
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        already += 1;
      }
    }
    const asked = leadIds?.length ? leadIds.length : leads.length;
    return { enrolled, already, skipped: Math.max(0, asked - leads.length) };
  },

  async enrollmentsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<OutreachEnrollmentDoc>(OutreachEnrollmentModel, {}, input, ENROLLMENT_TABLE);
    const sequences = await sequencesById(docs.map((doc) => doc.sequence_id));
    return { rows: docs.map((doc) => pubEnrollment(doc, sequences)), total, page, page_size };
  },

  async pause(enrollmentId: string) {
    const doc = await loadEnrollment(enrollmentId);
    if (doc.status !== 'ACTIVE') refuse('Only an active enrollment can be paused.');
    await OutreachEnrollmentModel.updateOne({ _id: doc._id, status: 'ACTIVE' }, { $set: { status: 'PAUSED' }, $push: { history: historyEntry('PAUSED', 'Paused') } });
    return publishEnrollment(enrollmentId);
  },

  /** A paused one carries on; a failed one retries the step it stopped on. A step that was sent is never sent twice. */
  async resume(enrollmentId: string) {
    const doc = await loadEnrollment(enrollmentId);
    if (doc.status !== 'PAUSED' && doc.status !== 'FAILED') refuse('Only a paused or failed enrollment can be resumed.');
    if (doc.status === 'FAILED') await OutreachSendModel.deleteOne({ enrollment_id: doc._id, step_index: doc.step_index, status: 'FAILED' });
    const waiting = doc.waiting_task_id ? await OutreachTaskModel.exists({ _id: doc.waiting_task_id, status: 'OPEN' }) : null;
    await OutreachEnrollmentModel.updateOne(
      { _id: doc._id, status: doc.status },
      { $set: { status: 'ACTIVE', error: '', next_at: waiting ? null : (doc.next_at ?? new Date()) }, $push: { history: historyEntry('RESUMED', 'Resumed') } }
    );
    return publishEnrollment(enrollmentId);
  },

  async remove(enrollmentId: string) {
    const doc = await loadEnrollment(enrollmentId);
    await OutreachTaskModel.updateMany({ enrollment_id: doc._id, status: 'OPEN' }, { $set: { status: 'CANCELLED' } });
    await OutreachEnrollmentModel.deleteOne({ _id: doc._id });
    return true;
  },

  async tasks() {
    const docs = await OutreachTaskModel.find({ status: 'OPEN' }).sort({ created_at: 1 }).limit(500).lean<OutreachTaskDoc[]>();
    const [sequences, leads, owners] = await Promise.all([
      sequencesById(docs.map((doc) => doc.sequence_id)),
      MarketingLeadModel.find({ _id: { $in: docs.map((doc) => doc.lead_id) } }).select('name instagram_handle').lean<MarketingLeadDoc[]>(),
      ownerNamesOf(docs),
    ]);
    const leadById = new Map(leads.map((lead) => [id(lead._id), lead]));
    return docs.map((doc) => pubTask(doc, sequences, leadById, owners));
  },

  /** The DM went out by hand: the task is done and the lead's walk carries on, past any wait, from the next step. */
  async completeTask(taskId: string, note: string | null | undefined, user: { id: string; name: string }) {
    const text = (note ?? '').trim();
    if (text.length > OUTREACH_LIMITS.note.max) refuse(`Keep the note under ${OUTREACH_LIMITS.note.max} characters.`);
    const task = isValidObjectId(taskId) ? await OutreachTaskModel.findById(taskId).lean<OutreachTaskDoc>() : null;
    if (!task) refuse('Task not found', 'NOT_FOUND');
    const done = await OutreachTaskModel.findOneAndUpdate(
      { _id: task._id, status: 'OPEN' },
      { $set: { status: 'DONE', done_by: user.id, done_by_name: user.name, done_at: new Date(), note: text } },
      { new: true }
    ).lean<OutreachTaskDoc>();
    if (!done) refuse('This task is already closed.', 'CONFLICT');
    await OutreachSendModel.updateOne({ enrollment_id: task.enrollment_id, step_index: task.step_index }, { $set: { status: 'SENT', detail: `DM sent by ${user.name}`, finished_at: new Date() } });
    const seq = await OutreachSequenceModel.findById(task.sequence_id).lean<OutreachSequenceDoc>();
    const next = nextReachingStep(seq?.steps ?? [], task.step_index + 1);
    const over = next.index >= (seq?.steps?.length ?? 0);
    await OutreachEnrollmentModel.updateOne(
      { _id: task.enrollment_id, waiting_task_id: id(task._id) },
      {
        $set: over
          ? { waiting_task_id: '', status: 'DONE', next_at: null }
          : { waiting_task_id: '', step_index: next.index, next_at: new Date(Date.now() + next.days * DAY_MS) },
        $push: { history: { $each: [historyEntry('TASK_DONE', `DM sent by ${user.name}`, task.step_index), ...(over ? [historyEntry('DONE', 'Every step done')] : [])] } },
      }
    );
    const [sequences, leads, owners] = await Promise.all([
      sequencesById([done.sequence_id]),
      MarketingLeadModel.find({ _id: done.lead_id }).select('name instagram_handle').lean<MarketingLeadDoc[]>(),
      ownerNamesOf([done]),
    ]);
    return pubTask(done, sequences, new Map(leads.map((lead) => [id(lead._id), lead])), owners);
  },
};

function pubTask(doc: OutreachTaskDoc, sequences: Map<string, OutreachSequenceDoc>, leads: Map<string, MarketingLeadDoc>, owners: Map<string, string>) {
  const lead = leads.get(id(doc.lead_id));
  const handle = lead?.instagram_handle ?? '';
  const owner = doc.owner_user_id ?? null;
  return {
    id: id(doc._id),
    sequence_id: id(doc.sequence_id),
    sequence_name: sequences.get(id(doc.sequence_id))?.name ?? '',
    enrollment_id: id(doc.enrollment_id),
    lead_id: id(doc.lead_id),
    lead_name: lead?.name ?? '',
    lead_instagram_handle: handle,
    lead_instagram_url: handle ? `https://www.instagram.com/${handle}/` : '',
    step_index: doc.step_index,
    text: doc.text ?? '',
    status: doc.status,
    owner_user_id: owner,
    owner_name: owner ? (owners.get(owner) ?? null) : null,
    done_by_name: doc.done_by_name ?? '',
    done_at: iso(doc.done_at),
    created_at: iso(doc.created_at),
  };
}
