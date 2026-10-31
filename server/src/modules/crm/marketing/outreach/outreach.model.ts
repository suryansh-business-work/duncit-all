import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { LEAD_PIPELINES } from '../leads/marketingLead.types';
import { ENROLLMENT_STATUSES, HISTORY_KINDS, SEND_STATUSES, STEP_KINDS, TASK_STATUSES } from './outreach.types';

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' } as const;

/** One step. Only the fields its kind reads are filled; the rest stay empty. */
const stepSchema = new Schema(
  {
    kind: { type: String, enum: STEP_KINDS, required: true },
    /** WAIT only: the days before the next step falls due. */
    wait_days: { type: Number, default: 0 },
    /** EMAIL only. */
    subject: { type: String, default: '' },
    /** The email text, or the DM a person sends. {name} and {company} are filled per lead. */
    body: { type: String, default: '' },
    /** WHATSAPP only: the AiSensy campaign name from the Communications portal's list. */
    wa_template_key: { type: String, default: '' },
    /** WHATSAPP only: the template's {{1}}, {{2}} … values, in order. */
    wa_params: { type: [String], default: [] },
  },
  { _id: false }
);

const sequenceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    /** Only leads of this pipeline may be enrolled; null takes any pipeline. */
    pipeline: { type: String, enum: [...LEAD_PIPELINES, null], default: null },
    steps: { type: [stepSchema], default: [] },
    /** Sends (and DM tasks) a day across the whole sequence, counted on the admin's clock. */
    daily_limit: { type: Number, default: 50 },
    /** Nothing goes out from this hour … */
    quiet_start_hour: { type: Number, default: 21 },
    /** … until this one, in the admin's time zone. Equal hours mean no quiet window. */
    quiet_end_hour: { type: Number, default: 9 },
    stop_on_reply: { type: Boolean, default: true },
    active: { type: Boolean, default: false, index: true },
    created_by: { type: String, default: '' },
    updated_by: { type: String, default: '' },
  },
  { timestamps, minimize: false }
);

const historySchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    kind: { type: String, enum: HISTORY_KINDS, required: true },
    step_index: { type: Number, default: -1 },
    text: { type: String, default: '' },
  },
  { _id: false }
);

/** One lead walking one sequence. A lead is in a sequence once (unique index below). */
const enrollmentSchema = new Schema(
  {
    sequence_id: { type: Schema.Types.ObjectId, ref: 'OutreachSequence', required: true },
    lead_id: { type: Schema.Types.ObjectId, ref: 'MarketingLead', required: true, index: true },
    /** Copied at enrollment so the table searches and reads without a join. */
    lead_name: { type: String, default: '' },
    lead_company: { type: String, default: '' },
    /** The step that runs next. Never a WAIT: waits are folded into next_at. */
    step_index: { type: Number, default: 0 },
    /** When the next step falls due; null while a DM task is open or the enrollment is not ACTIVE. */
    next_at: { type: Date, default: null },
    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'ACTIVE', index: true },
    /** The open DM task the walk is waiting on, when it is waiting on one. */
    waiting_task_id: { type: String, default: '' },
    error: { type: String, default: '' },
    history: { type: [historySchema], default: [] },
    enrolled_by: { type: String, default: '' },
  },
  { timestamps, minimize: false }
);

enrollmentSchema.index({ sequence_id: 1, lead_id: 1 }, { unique: true });
enrollmentSchema.index({ status: 1, next_at: 1 });

/**
 * One step sent (or tried) for one enrollment — the record of every send, and
 * the claim that makes a send happen once: the unique (enrollment, step)
 * index means a second tick that reaches the same step cannot insert it.
 */
const sendSchema = new Schema(
  {
    sequence_id: { type: Schema.Types.ObjectId, required: true, index: true },
    enrollment_id: { type: Schema.Types.ObjectId, required: true },
    lead_id: { type: Schema.Types.ObjectId, required: true, index: true },
    step_index: { type: Number, required: true },
    kind: { type: String, enum: STEP_KINDS, required: true },
    /** The address or number written to; '' for a DM task. */
    destination: { type: String, default: '' },
    status: { type: String, enum: SEND_STATUSES, default: 'CLAIMED' },
    detail: { type: String, default: '' },
    run_id: { type: String, default: '' },
    claimed_at: { type: Date, default: Date.now },
    finished_at: { type: Date, default: null },
  },
  { timestamps, minimize: false }
);

sendSchema.index({ enrollment_id: 1, step_index: 1 }, { unique: true });
sendSchema.index({ sequence_id: 1, claimed_at: -1 });

/** A DM a person sends by hand: shown on the page, marked done there. Nothing is sent for them. */
const taskSchema = new Schema(
  {
    sequence_id: { type: Schema.Types.ObjectId, required: true, index: true },
    enrollment_id: { type: Schema.Types.ObjectId, required: true, index: true },
    lead_id: { type: Schema.Types.ObjectId, required: true },
    step_index: { type: Number, required: true },
    /** The DM to send, with the lead's name and company filled in. */
    text: { type: String, default: '' },
    status: { type: String, enum: TASK_STATUSES, default: 'OPEN', index: true },
    /** The lead's owner when the task was made — whose task it is. */
    owner_user_id: { type: String, default: null },
    done_by: { type: String, default: '' },
    done_by_name: { type: String, default: '' },
    done_at: { type: Date, default: null },
    note: { type: String, default: '' },
  },
  { timestamps, minimize: false }
);

export type OutreachSequenceDoc = InferSchemaType<typeof sequenceSchema> & { _id: Types.ObjectId; created_at?: Date; updated_at?: Date };
export type OutreachStepDoc = InferSchemaType<typeof stepSchema>;
export type OutreachEnrollmentDoc = InferSchemaType<typeof enrollmentSchema> & { _id: Types.ObjectId; created_at?: Date; updated_at?: Date };
export type OutreachHistoryEntry = InferSchemaType<typeof historySchema>;
export type OutreachSendDoc = InferSchemaType<typeof sendSchema> & { _id: Types.ObjectId };
export type OutreachTaskDoc = InferSchemaType<typeof taskSchema> & { _id: Types.ObjectId; created_at?: Date };

export const OutreachSequenceModel = model('OutreachSequence', sequenceSchema, 'outreach_sequences');
export const OutreachEnrollmentModel = model('OutreachEnrollment', enrollmentSchema, 'outreach_enrollments');
export const OutreachSendModel = model('OutreachSend', sendSchema, 'outreach_sends');
export const OutreachTaskModel = model('OutreachTask', taskSchema, 'outreach_tasks');
