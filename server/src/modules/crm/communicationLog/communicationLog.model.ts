import { Schema, model, InferSchemaType } from 'mongoose';

export const COMMS_LOG_TYPES = ['EMAIL', 'CALL'] as const;
export type CommsLogType = (typeof COMMS_LOG_TYPES)[number];

export const COMMS_LOG_DIRECTIONS = ['OUTBOUND', 'INBOUND'] as const;
export const COMMS_LOG_ENTITIES = ['VENUE_LEAD', 'HOST_LEAD'] as const;
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
    external_id: { type: String, default: '', index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    created_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

communicationLogSchema.index({ entity_type: 1, entity_id: 1, created_at: -1 });

export type CommunicationLogDoc = InferSchemaType<typeof communicationLogSchema> & { _id: any };
export const CommunicationLogModel = model('CommunicationLog', communicationLogSchema);
