import { Schema, model, InferSchemaType } from 'mongoose';

export const COMMS_LOG_TYPES = ['EMAIL', 'CALL'] as const;
export type CommsLogType = (typeof COMMS_LOG_TYPES)[number];

export const COMMS_LOG_DIRECTIONS = ['OUTBOUND', 'INBOUND'] as const;
export const COMMS_LOG_ENTITIES = ['VENUE_LEAD', 'HOST_LEAD', 'ECOMM_LEAD', 'CREATOR_LEAD', 'COMMUNITY_LEAD'] as const;
export type CommsLogEntity = (typeof COMMS_LOG_ENTITIES)[number];

export const COMMS_LOG_STATUSES = [
  'QUEUED',
  'SENT',
  'DELIVERED',
  'FAILED',
  'INITIATED',
  'RINGING',
  'IN_PROGRESS',
  'COMPLETED',
  'NO_ANSWER',
  'BUSY',
] as const;

export const CALL_SPEAKERS = ['AGENT', 'LEAD'] as const;
export type CallSpeaker = (typeof CALL_SPEAKERS)[number];

export const SUMMARY_STATUSES = ['NONE', 'PENDING', 'READY', 'FAILED'] as const;
export type SummaryStatus = (typeof SUMMARY_STATUSES)[number];

export const CALL_SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'] as const;
export type CallSentiment = (typeof CALL_SENTIMENTS)[number];

/**
 * One finished utterance from Twilio's live transcription. `seq` + `track`
 * identify it, so a callback Twilio retries is stored once.
 */
const transcriptSegmentSchema = new Schema(
  {
    seq: { type: Number, required: true },
    track: { type: String, default: '' },
    speaker: { type: String, enum: CALL_SPEAKERS, required: true },
    text: { type: String, default: '' },
    confidence: { type: Number, default: null },
    at: { type: Date, default: null },
  },
  { _id: false }
);

/** The AI read of a finished call; `reminder_id` is set once, so a re-run never adds a second reminder. */
const callSummarySchema = new Schema(
  {
    status: { type: String, enum: SUMMARY_STATUSES, default: 'NONE' },
    text: { type: String, default: '' },
    key_points: { type: [String], default: [] },
    sentiment: { type: String, enum: [...CALL_SENTIMENTS, null], default: null },
    outcome: { type: String, default: '' },
    follow_ups: { type: [String], default: [] },
    reminder_id: { type: String, default: null },
    error: { type: String, default: '' },
    generated_at: { type: Date, default: null },
    claimed_at: { type: Date, default: null },
  },
  { _id: false }
);

/**
 * One record per outbound email or call from CRM. The transcript / recording
 * URL is filled asynchronously by the Servam AI pipeline after Twilio signals
 * call completion; for emails, transcript stays null and `body` holds the
 * HTML the user composed.
 */
const communicationLogSchema = new Schema(
  {
    type: { type: String, enum: COMMS_LOG_TYPES, required: true, index: true },
    direction: { type: String, enum: COMMS_LOG_DIRECTIONS, default: 'OUTBOUND' },
    entity_type: { type: String, enum: COMMS_LOG_ENTITIES, required: true, index: true },
    entity_id: { type: Schema.Types.ObjectId, required: true, index: true },
    provider_id: { type: Schema.Types.ObjectId, ref: 'CommsProvider', default: null },
    provider_name: { type: String, default: '' },
    contact_name: { type: String, default: '' },
    contact_value: { type: String, default: '', index: true },
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
    status: { type: String, enum: COMMS_LOG_STATUSES, default: 'QUEUED', index: true },
    error_message: { type: String, default: '' },
    duration_seconds: { type: Number, default: 0 },
    recording_url: { type: String, default: '' },
    transcript: { type: String, default: '' },
    transcript_status: {
      type: String,
      enum: ['NONE', 'PENDING', 'READY', 'FAILED'],
      default: 'NONE',
    },
    transcript_segments: { type: [transcriptSegmentSchema], default: [] },
    summary: { type: callSummarySchema, default: () => ({}) },
    external_id: { type: String, default: '', index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    created_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

communicationLogSchema.index({ entity_type: 1, entity_id: 1, created_at: -1 });
// The agent's own call that is still live (restoring the call window after a reload).
communicationLogSchema.index({ created_by: 1, created_at: -1 });
// A call made on a phone's own SIM is reported by the Duncit CRM app, and the
// app re-sends whatever it is unsure the server took. One row per caller per
// device call: the partial filter leaves every Twilio/email log untouched.
communicationLogSchema.index(
  { created_by: 1, external_id: 1 },
  { unique: true, name: 'device_call_once', partialFilterExpression: { 'metadata.mode': 'DEVICE' } }
);

export type CommunicationLogDoc = InferSchemaType<typeof communicationLogSchema> & { _id: any };
export const CommunicationLogModel = model('CommunicationLog', communicationLogSchema);
