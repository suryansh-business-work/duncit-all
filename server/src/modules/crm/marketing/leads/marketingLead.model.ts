import { Schema, model, type InferSchemaType } from 'mongoose';
import { LEAD_CRM_KINDS, LEAD_PIPELINES, LEAD_SOURCES, LEAD_STAGES, LEAD_TIMELINE_KINDS } from './marketingLead.types';

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' } as const;

const noteSchema = new Schema(
  {
    at: { type: Date, required: true },
    by_user_id: { type: String, default: null },
    by_name: { type: String, default: '' },
    text: { type: String, required: true },
  },
  { _id: false }
);

/** One thing that happened to the lead, in the order it happened. */
const timelineSchema = new Schema(
  {
    at: { type: Date, required: true },
    kind: { type: String, enum: LEAD_TIMELINE_KINDS, required: true },
    text: { type: String, default: '' },
    by_name: { type: String, default: '' },
  },
  { _id: false }
);

/**
 * One lead, whichever source found it. The dedupe keys are derived on every
 * write (marketingLead.keys.ts) and are what a second sighting is matched on;
 * nothing here is unique by index, because the merge rule is the guard and a
 * racing insert is corrected by the next merge rather than refused.
 */
const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, default: '', trim: true },
    pipeline: { type: String, enum: LEAD_PIPELINES, default: 'GENERAL', index: true },
    stage: { type: String, enum: LEAD_STAGES, default: 'NEW', index: true },
    source: { type: String, enum: LEAD_SOURCES, required: true, index: true },
    emails: { type: [String], default: [] },
    phones: { type: [String], default: [] },
    website: { type: String, default: '' },
    instagram_handle: { type: String, default: '', index: true },
    city: { type: String, default: '', trim: true, index: true },
    /** 0-100 for how well the lead fits what it was found for; null when nobody scored it. */
    score: { type: Number, default: null, index: true },
    score_reason: { type: String, default: '' },
    owner_user_id: { type: String, default: null, index: true },
    tags: { type: [String], default: [] },
    notes: { type: [noteSchema], default: [] },
    timeline: { type: [timelineSchema], default: [] },
    phone_keys: { type: [String], default: [], index: true },
    email_keys: { type: [String], default: [], index: true },
    website_host: { type: String, default: '', index: true },
    /** Set once the lead has become a CRM record; the table filters on it. */
    promoted: { type: Boolean, default: false, index: true },
    crm_ref: {
      kind: { type: String, enum: [...LEAD_CRM_KINDS, null], default: null },
      id: { type: String, default: '' },
      promoted_at: { type: Date, default: null },
      promoted_by: { type: String, default: '' },
    },
    source_ref: {
      ig_lead_id: { type: String, default: '', index: true },
      search_id: { type: String, default: '' },
      import_id: { type: String, default: '' },
    },
    created_by: { type: String, default: null },
  },
  { timestamps, minimize: false }
);

leadSchema.index({ stage: 1, created_at: -1 });
leadSchema.index({ pipeline: 1, stage: 1 });
// Marketing › Analytics: the leads created in a window, the stage changes made in one and the leads promoted in one.
leadSchema.index({ created_at: -1 });
leadSchema.index({ 'timeline.at': -1 });
leadSchema.index({ 'crm_ref.promoted_at': -1 });

export type MarketingLeadDoc = InferSchemaType<typeof leadSchema> & { _id: unknown; created_at?: Date; updated_at?: Date };
export type MarketingLeadNote = InferSchemaType<typeof noteSchema>;
export type MarketingLeadTimelineEntry = InferSchemaType<typeof timelineSchema>;

export const MarketingLeadModel = model('MarketingLead', leadSchema, 'marketing_leads');
