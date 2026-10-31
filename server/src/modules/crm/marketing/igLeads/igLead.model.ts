import { Schema, model, type InferSchemaType } from 'mongoose';
import { IG_LEAD_SEARCH_STATUSES, IG_LEAD_STATUSES } from './igLead.types';

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' } as const;

/** One DM the marketer sent. Step 0 is the opener; 1, 2 … are the follow-ups. */
const messageSchema = new Schema(
  {
    step: { type: Number, required: true },
    text: { type: String, required: true },
    sent_at: { type: Date, required: true },
    sent_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

/**
 * A public Instagram business or creator profile and where the conversation
 * with it stands. Only what the profile itself publishes is kept: its bio,
 * counts, website, and any email or phone written in the bio or Google's
 * snippet of the page.
 */
const leadSchema = new Schema(
  {
    username: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: '' },
    bio: { type: String, default: '' },
    website: { type: String, default: '' },
    followers: { type: Number, default: null },
    follows: { type: Number, default: null },
    media_count: { type: Number, default: null },
    profile_picture_url: { type: String, default: '' },
    emails: { type: [String], default: [] },
    phones: { type: [String], default: [] },
    /** 0-100 against the brief it was found for; null when the AI could not score it. */
    fit_score: { type: Number, default: null, index: true },
    fit_reason: { type: String, default: '' },
    status: { type: String, enum: IG_LEAD_STATUSES, default: 'NEW', index: true },
    /** The AI's draft of the next message, and which step it is for. */
    draft: { type: String, default: '' },
    draft_step: { type: Number, default: null },
    messages: { type: [messageSchema], default: [] },
    last_contacted_at: { type: Date, default: null },
    /** When the next follow-up is due; null once none is left or the conversation closed. */
    next_follow_up_at: { type: Date, default: null, index: true },
    replied_at: { type: Date, default: null },
    search_id: { type: Schema.Types.ObjectId, ref: 'IgLeadSearch', default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps }
);
leadSchema.index({ username: 1 }, { unique: true });
leadSchema.index({ 'messages.sent_at': 1 });

/** One run of a brief: what the AI planned, and how many profiles came of it. */
const searchSchema = new Schema(
  {
    brief: { type: String, required: true },
    max_results: { type: Number, required: true },
    summary: { type: String, default: '' },
    queries: { type: [String], default: [] },
    status: { type: String, enum: IG_LEAD_SEARCH_STATUSES, default: 'RUNNING' },
    /** Profiles the searches turned up, new ones added, and ones dropped (known, personal, out of range). */
    found: { type: Number, default: 0 },
    added: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    error: { type: String, default: '' },
    finished_at: { type: Date, default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps }
);
// One search at a time: each spends Serper credits, and two would race for the same profiles.
searchSchema.index({ status: 1 }, { unique: true, partialFilterExpression: { status: 'RUNNING' } });

/** The one settings document: how many follow-ups, how far apart, and the daily cap. */
const settingsSchema = new Schema(
  {
    key: { type: String, default: 'default', unique: true },
    max_follow_ups: { type: Number, default: 3 },
    follow_up_gap_days: { type: Number, default: 3 },
    daily_send_limit: { type: Number, default: 20 },
    /** What Duncit is offering these leads — the AI writes every DM around it. */
    pitch: { type: String, default: '' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps }
);

export type IgLeadDoc = InferSchemaType<typeof leadSchema> & { _id: unknown };
export type IgLeadSearchDoc = InferSchemaType<typeof searchSchema> & { _id: unknown };
export type IgLeadSettingsDoc = InferSchemaType<typeof settingsSchema>;

export const IgLeadModel = model('IgLead', leadSchema);
export const IgLeadSearchModel = model('IgLeadSearch', searchSchema);
export const IgLeadSettingsModel = model('IgLeadSettings', settingsSchema);
