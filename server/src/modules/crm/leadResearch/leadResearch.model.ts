import { Schema, model, type InferSchemaType } from 'mongoose';
import { EVIDENCE_STATUSES, QUALITY_LEAD_TYPES } from '@modules/crm/leadQuality/leadQuality.rules';
import { EVIDENCE_VIA } from '@modules/crm/leadQuality/leadQuality.model';

/**
 * CRM › Lead Research: the review queue researched leads wait in before
 * anyone adds them to the CRM. A candidate is found by a discovery job
 * (Instagram and Google Maps through Serper) or handed in by an AI assistant
 * through MCP; it is checked against every CRM lead for duplicates and scored
 * with the same published configuration and evidence rules as a CRM lead.
 *
 * Nothing here becomes a CRM lead on its own: a CRM manager (or an assistant
 * acting for one, after they confirm) approves it, and the CRM's own create
 * function — duplicate guard included — makes the lead.
 */

export const CANDIDATE_STATUSES = ['NEW', 'ADDED', 'REJECTED', 'DUPLICATE'] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const CANDIDATE_ORIGINS = ['DISCOVERY', 'MCP'] as const;
export type CandidateOrigin = (typeof CANDIDATE_ORIGINS)[number];

export const SOURCE_KINDS = ['INSTAGRAM', 'GOOGLE_MAPS', 'WEB'] as const;
export type CandidateSourceKind = (typeof SOURCE_KINDS)[number];

const actorSchema = new Schema({ id: { type: String, default: null }, name: { type: String, default: '' } }, { _id: false });

const sourceSchema = new Schema(
  {
    kind: { type: String, enum: SOURCE_KINDS, required: true },
    url: { type: String, default: '' },
    title: { type: String, default: '' },
    /** The public text the candidate was read from (bio, snippet, listing) — what AI verification may quote. */
    text: { type: String, default: '' },
  },
  { _id: false }
);

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

const duplicateSchema = new Schema(
  {
    entity_type: { type: String, required: true },
    lead_id: { type: String, required: true },
    lead_name: { type: String, default: '' },
    match: { type: String, default: '' },
  },
  { _id: false }
);

const candidateSchema = new Schema(
  {
    lead_type: { type: String, enum: QUALITY_LEAD_TYPES, required: true, index: true },
    job_id: { type: String, default: null, index: true },
    origin: { type: String, enum: CANDIDATE_ORIGINS, required: true },
    name: { type: String, required: true, trim: true },
    city: { type: String, default: '', trim: true, index: true },
    area: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    category: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    phones: { type: [String], default: [] },
    emails: { type: [String], default: [] },
    website: { type: String, default: '' },
    instagram_handle: { type: String, default: '', index: true },
    sources: { type: [sourceSchema], default: [] },
    items: { type: [evidenceSchema], default: [] },
    /** The QualityResult from the published configuration, same shape as a CRM lead's. */
    result: { type: Schema.Types.Mixed, default: null },
    score: { type: Number, default: null, index: true },
    qualification: { type: String, default: 'PENDING_VERIFICATION', index: true },
    classification_label: { type: String, default: '' },
    tone: { type: String, default: 'error' },
    config_version: { type: Number, default: null },
    /** What the candidate shares with existing CRM leads; non-empty means it can never be added. */
    duplicates: { type: [duplicateSchema], default: [] },
    /** Identity keys (ig:, phone:, email:, web:) — a second sighting in any batch is matched on these. */
    keys: { type: [String], default: [], index: true },
    status: { type: String, enum: CANDIDATE_STATUSES, default: 'NEW', index: true },
    crm_lead_id: { type: String, default: null },
    decided_by: { type: actorSchema, default: null },
    decided_at: { type: Date, default: null },
    decision_note: { type: String, default: '' },
    skipped_checks: { type: [String], default: [] },
    created_by: { type: actorSchema, default: () => ({}) },
    /** Bumped on every evidence write; an older writer re-reads and retries. */
    revision: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, minimize: false }
);
candidateSchema.index({ lead_type: 1, status: 1, score: -1 });
candidateSchema.index({ created_at: -1 });

export type LeadCandidateDoc = InferSchemaType<typeof candidateSchema> & { _id: unknown; created_at: Date; updated_at: Date };
export type CandidateEvidenceDoc = InferSchemaType<typeof evidenceSchema>;
export type CandidateSource = InferSchemaType<typeof sourceSchema>;

export const LeadCandidateModel = model('CrmLeadCandidate', candidateSchema, 'crm_lead_candidates');
