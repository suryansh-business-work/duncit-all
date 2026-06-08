import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * One row per time a survey is generated / filled for a CRM venue/host lead.
 * Replaces the single embedded `survey_response` so the lead keeps a full log:
 *  - MANUAL — staff filled it inside CRM
 *  - LINK   — staff generated a public link (mweb /s/:token) for the person to fill
 *  - APP    — synced from the mWeb/mobile onboarding gate on meeting request
 */
export const LEAD_SURVEY_ENTITIES = ['VENUE_LEAD', 'HOST_LEAD'] as const;
export const LEAD_SURVEY_SOURCES = ['MANUAL', 'LINK', 'APP'] as const;
export type LeadSurveyEntity = (typeof LEAD_SURVEY_ENTITIES)[number];
export type LeadSurveySource = (typeof LEAD_SURVEY_SOURCES)[number];

const answerSchema = new Schema(
  {
    qid: { type: String, required: true },
    value: { type: String, default: null },
    values: { type: [String], default: [] },
  },
  { _id: false }
);

const leadSurveyEntrySchema = new Schema(
  {
    entity: { type: String, enum: LEAD_SURVEY_ENTITIES, required: true, index: true },
    lead_id: { type: Schema.Types.ObjectId, required: true, index: true },
    survey_id: { type: Schema.Types.ObjectId, ref: 'Survey', required: true },
    source: { type: String, enum: LEAD_SURVEY_SOURCES, required: true },
    // LINK only: opaque share token for the public mWeb fill page.
    token: { type: String, default: null, index: true },
    token_revoked: { type: Boolean, default: false },
    generated_by: { type: String, default: null },
    answers: { type: [answerSchema], default: [] },
    filled: { type: Boolean, default: false },
    submitted_at: { type: Date, default: null },
    // staff user id (MANUAL), 'external' (LINK), or the gate user id (APP).
    submitted_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

leadSurveyEntrySchema.index({ entity: 1, lead_id: 1, created_at: -1 });

export type LeadSurveyEntryDoc = InferSchemaType<typeof leadSurveyEntrySchema> & { _id: Types.ObjectId };
export const LeadSurveyEntryModel = model('LeadSurveyEntry', leadSurveyEntrySchema);
