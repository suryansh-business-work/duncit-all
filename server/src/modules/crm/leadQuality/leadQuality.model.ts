import { Schema, model, type InferSchemaType } from 'mongoose';
import { AUTO_CHECKS, BAND_TONES, EVIDENCE_STATUSES, QUALITY_LEAD_TYPES } from './leadQuality.rules';

/**
 * Lead Quality Score storage.
 *
 *  - CrmLeadQualityConfig: one row per version of a lead type's scoring model.
 *    A DRAFT is edited freely (one per lead type); publishing turns it into the
 *    newest PUBLISHED version, which is never edited again — older published
 *    versions become ARCHIVED, so the version history is the rows themselves.
 *  - CrmLeadQuality: one row per lead: the evidence recorded against each item
 *    and the latest result worked out from it. The lead itself carries a
 *    summary (`quality` on each lead model) so listings sort and filter on it.
 *  - CrmLeadQualityEvent: append-only history of every score change, evidence
 *    decision and settings change. Updates are refused at the model, so a row
 *    can never be rewritten after the fact.
 */

export const CONFIG_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type QualityConfigStatus = (typeof CONFIG_STATUSES)[number];

/** Who decided an item: a person in the console, an AI assistant through MCP, or the server's own check. */
export const EVIDENCE_VIA = ['MANUAL', 'MCP', 'SYSTEM', 'AI'] as const;
export type EvidenceVia = (typeof EVIDENCE_VIA)[number];

export const QUALITY_ORIGINS = ['MANUAL', 'RESEARCH'] as const;
export type QualityOrigin = (typeof QUALITY_ORIGINS)[number];

export const EVENT_KINDS = ['SCORE', 'EVIDENCE', 'CONFIG_DRAFT', 'CONFIG_PUBLISH', 'CONFIG_DISCARD'] as const;
export type QualityEventKind = (typeof EVENT_KINDS)[number];

export const SCORE_TRIGGERS = ['CREATE', 'UPDATE', 'EVIDENCE', 'RECALCULATE', 'CONFIG_PUBLISH', 'RESEARCH', 'BACKFILL'] as const;
export type ScoreTrigger = (typeof SCORE_TRIGGERS)[number];

const actorSchema = new Schema({ id: { type: String, default: null }, name: { type: String, default: '' } }, { _id: false });

const subCriterionSchema = new Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    points: { type: Number, required: true },
    mandatory: { type: Boolean, default: false },
    auto_check: { type: String, enum: AUTO_CHECKS, default: 'NONE' },
    threshold: { type: Number, default: null },
    guidance: { type: String, default: '' },
  },
  { _id: false }
);

const criterionSchema = new Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    weightage: { type: Number, required: true },
    enabled: { type: Boolean, default: true },
    mandatory: { type: Boolean, default: false },
    auto_check: { type: String, enum: AUTO_CHECKS, default: 'NONE' },
    threshold: { type: Number, default: null },
    guidance: { type: String, default: '' },
    sub_criteria: { type: [subCriterionSchema], default: [] },
  },
  { _id: false }
);

const bandSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    min: { type: Number, required: true },
    tone: { type: String, enum: BAND_TONES, required: true },
  },
  { _id: false }
);

const configSchema = new Schema(
  {
    lead_type: { type: String, enum: QUALITY_LEAD_TYPES, required: true },
    version: { type: Number, required: true },
    status: { type: String, enum: CONFIG_STATUSES, required: true },
    criteria: { type: [criterionSchema], default: [] },
    min_qualification_score: { type: Number, default: null },
    bands: { type: [bandSchema], default: [] },
    change_note: { type: String, default: '' },
    /** Bumped on every draft save; a save carrying an older revision is refused (two admins editing at once). */
    revision: { type: Number, default: 0 },
    created_by: { type: actorSchema, default: () => ({}) },
    updated_by: { type: actorSchema, default: () => ({}) },
    published_by: { type: actorSchema, default: null },
    published_at: { type: Date, default: null },
    archived_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
configSchema.index({ lead_type: 1, version: 1 }, { unique: true });
configSchema.index({ lead_type: 1, status: 1, version: -1 });
// One draft per lead type at a time.
configSchema.index({ lead_type: 1 }, { unique: true, partialFilterExpression: { status: 'DRAFT' }, name: 'one_draft_per_lead_type' });

const evidenceSchema = new Schema(
  {
    item_key: { type: String, required: true },
    status: { type: String, enum: EVIDENCE_STATUSES, required: true },
    evidence: { type: String, default: '' },
    source_url: { type: String, default: '' },
    notes: { type: String, default: '' },
    via: { type: String, enum: EVIDENCE_VIA, required: true },
    actor: { type: actorSchema, default: () => ({}) },
    decided_at: { type: Date, required: true },
  },
  { _id: false }
);

const qualitySchema = new Schema(
  {
    entity_type: { type: String, enum: QUALITY_LEAD_TYPES, required: true },
    lead_id: { type: String, required: true },
    items: { type: [evidenceSchema], default: [] },
    /** The full QualityResult (criterion-wise breakdown) the summary on the lead was taken from. */
    result: { type: Schema.Types.Mixed, default: null },
    score: { type: Number, default: null },
    config_version: { type: Number, default: null },
    scored_at: { type: Date, default: null },
    origin: { type: String, enum: QUALITY_ORIGINS, default: 'MANUAL' },
    /** RESEARCH only: the candidate this lead was added from. */
    candidate_id: { type: String, default: null },
    /** Bumped on every write; a writer holding an older revision re-reads and retries. */
    revision: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, minimize: false }
);
qualitySchema.index({ entity_type: 1, lead_id: 1 }, { unique: true });
qualitySchema.index({ entity_type: 1, origin: 1 });

const eventSchema = new Schema(
  {
    kind: { type: String, enum: EVENT_KINDS, required: true },
    entity_type: { type: String, enum: QUALITY_LEAD_TYPES, required: true },
    lead_id: { type: String, default: null },
    trigger: { type: String, enum: [...SCORE_TRIGGERS, null], default: null },
    score_before: { type: Number, default: null },
    score_after: { type: Number, default: null },
    classification: { type: String, default: '' },
    qualification: { type: String, default: '' },
    config_version: { type: Number, default: null },
    item_key: { type: String, default: '' },
    status_before: { type: String, default: '' },
    status_after: { type: String, default: '' },
    evidence: { type: String, default: '' },
    source_url: { type: String, default: '' },
    via: { type: String, enum: [...EVIDENCE_VIA, null], default: null },
    actor: { type: actorSchema, default: () => ({}) },
    note: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
eventSchema.index({ entity_type: 1, lead_id: 1, created_at: -1 });
eventSchema.index({ kind: 1, created_at: -1 });

const immutable = () => {
  throw new Error('Lead quality history is append-only.');
};
for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace'] as const) {
  eventSchema.pre(op, immutable);
}

export type QualityConfigDoc = InferSchemaType<typeof configSchema> & { _id: unknown };
export type LeadQualityDoc = InferSchemaType<typeof qualitySchema> & { _id: unknown };
export type QualityEvidenceDoc = InferSchemaType<typeof evidenceSchema>;
export type QualityEventDoc = InferSchemaType<typeof eventSchema> & { _id: unknown; created_at: Date };

export const LeadQualityConfigModel = model('CrmLeadQualityConfig', configSchema, 'crm_lead_quality_configs');
export const LeadQualityModel = model('CrmLeadQuality', qualitySchema, 'crm_lead_qualities');
export const LeadQualityEventModel = model('CrmLeadQualityEvent', eventSchema, 'crm_lead_quality_events');
