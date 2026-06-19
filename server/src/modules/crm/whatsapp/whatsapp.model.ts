import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * CRM WhatsApp Lead Generator — Mongo models. The duncit server orchestrates the
 * OpenWA gateway (portals/crm/open-wa-server): it stores the gateway connection
 * config, caches the communities / groups / contacts pulled from OpenWA (so the
 * CRM reads from Mongo first), and materialises a User Lead per imported number.
 *
 * A single gateway connection is supported (`key: 'default'`). Cache + lead
 * collections are namespaced by `connection_key` so a future multi-account setup
 * can co-exist without schema changes.
 */
export const WA_STATUSES = ['DISCONNECTED', 'CONNECTING', 'CONNECTED', 'ERROR'] as const;
export type WaStatus = (typeof WA_STATUSES)[number];

const connectionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    base_url: { type: String, default: '' },
    api_key: { type: String, default: '' },
    session_id: { type: String, default: 'duncit-crm' },
    status: { type: String, enum: WA_STATUSES, default: 'DISCONNECTED' },
    phone: { type: String, default: null },
    last_error: { type: String, default: null },
    connected_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
export type WaConnectionDoc = InferSchemaType<typeof connectionSchema> & { _id: Types.ObjectId };
export const WaConnectionModel = model('WaConnection', connectionSchema);

const communitySchema = new Schema(
  {
    connection_key: { type: String, required: true, default: 'default' },
    community_jid: { type: String, required: true },
    name: { type: String, default: '' },
    groups_count: { type: Number, default: 0 },
    raw: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
communitySchema.index({ connection_key: 1, community_jid: 1 }, { unique: true });
export type WaCommunityDoc = InferSchemaType<typeof communitySchema> & { _id: Types.ObjectId };
export const WaCommunityModel = model('WaCommunity', communitySchema);

const groupSchema = new Schema(
  {
    connection_key: { type: String, required: true, default: 'default' },
    group_jid: { type: String, required: true },
    name: { type: String, default: '' },
    // Parent community JID (OpenWA `linkedParentJID`); null for standalone groups.
    community_jid: { type: String, default: null, index: true },
    members_count: { type: Number, default: 0 },
    raw: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
groupSchema.index({ connection_key: 1, group_jid: 1 }, { unique: true });
export type WaGroupDoc = InferSchemaType<typeof groupSchema> & { _id: Types.ObjectId };
export const WaGroupModel = model('WaGroup', groupSchema);

const contactSchema = new Schema(
  {
    connection_key: { type: String, required: true, default: 'default' },
    contact_jid: { type: String, required: true },
    phone: { type: String, default: '', index: true },
    name: { type: String, default: '' },
    push_name: { type: String, default: '' },
    is_business: { type: Boolean, default: false },
    raw: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
contactSchema.index({ connection_key: 1, contact_jid: 1 }, { unique: true });
export type WaContactDoc = InferSchemaType<typeof contactSchema> & { _id: Types.ObjectId };
export const WaContactModel = model('WaContact', contactSchema);

const sourceRefSchema = new Schema(
  { jid: { type: String, default: '' }, name: { type: String, default: '' } },
  { _id: false }
);

const userLeadSchema = new Schema(
  {
    connection_key: { type: String, required: true, default: 'default' },
    phone: { type: String, required: true, index: true },
    name: { type: String, default: '' },
    contact_jid: { type: String, default: '' },
    // Provenance — which WhatsApp account/community/group(s) this number came from.
    source_account: { type: String, default: '' },
    source_communities: { type: [sourceRefSchema], default: [] },
    source_groups: { type: [sourceRefSchema], default: [] },
    imported_at: { type: Date, default: Date.now },
    raw: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
userLeadSchema.index({ connection_key: 1, phone: 1 }, { unique: true });
export type WaUserLeadDoc = InferSchemaType<typeof userLeadSchema> & { _id: Types.ObjectId };
export const WaUserLeadModel = model('WaUserLead', userLeadSchema);

export const WA_JOB_STATUSES = ['RUNNING', 'DONE', 'FAILED'] as const;
export type WaJobStatus = (typeof WA_JOB_STATUSES)[number];

/**
 * Background data-extraction job. Started by the CRM, it pulls communities /
 * groups / contacts from the gateway and materialises leads, tracking live
 * progress + a quality breakdown (valid / invalid / duplicate) the UI polls.
 */
const extractionJobSchema = new Schema(
  {
    connection_key: { type: String, required: true, default: 'default', index: true },
    status: { type: String, enum: WA_JOB_STATUSES, default: 'RUNNING' },
    phase: { type: String, default: 'starting' },
    total: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    valid: { type: Number, default: 0 },
    invalid: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    communities: { type: Number, default: 0 },
    groups: { type: Number, default: 0 },
    leads_created: { type: Number, default: 0 },
    error: { type: String, default: null },
    started_at: { type: Date, default: Date.now },
    finished_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
export type WaExtractionJobDoc = InferSchemaType<typeof extractionJobSchema> & { _id: Types.ObjectId };
export const WaExtractionJobModel = model('WaExtractionJob', extractionJobSchema);
