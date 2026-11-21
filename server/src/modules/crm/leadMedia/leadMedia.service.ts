import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { LEAD_MODELS } from '@modules/crm/crm/crm.service';
import { CRM_LEAD_ENTITY_TYPES, type CrmLeadEntityType } from '@modules/crm/crm/crm.constants';
import { CRM_LEAD_MEDIA_KINDS, CrmLeadMediaModel, type CrmLeadMediaKind } from './leadMedia.model';

/** Formats a browser previews in an <img>: raster photos plus SVG for vector logos. */
export const CRM_LEAD_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'] as const;
/** Per lead and kind: enough for every variant of a brand without turning the tab into a gallery. */
export const CRM_LEAD_MEDIA_LIMITS: Record<CrmLeadMediaKind, number> = { LOGO: 10, IMAGE: 50 };

export interface LeadMediaInput {
  kind?: string | null;
  url?: string | null;
  name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
}

// Function declarations (not arrows) so a call narrows the type after it.
function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}
function notFound(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'NOT_FOUND' } });
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : null);
const positiveOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null);

function entityType(value: unknown): CrmLeadEntityType {
  if (!CRM_LEAD_ENTITY_TYPES.includes(value as CrmLeadEntityType)) bad('Unknown lead type');
  return value as CrmLeadEntityType;
}

function mediaKind(value: unknown): CrmLeadMediaKind {
  if (!CRM_LEAD_MEDIA_KINDS.includes(value as CrmLeadMediaKind)) bad('Pick Logo or Image');
  return value as CrmLeadMediaKind;
}

function objectId(id: string, what: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) notFound(`${what} not found`);
  return new Types.ObjectId(id);
}

function httpsUrl(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  let protocol = '';
  try {
    protocol = new URL(raw).protocol;
  } catch {
    protocol = '';
  }
  if (protocol !== 'https:') bad('Images must be uploaded files served over https');
  return raw;
}

function mimeType(value: unknown): string {
  const type = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (type && !(CRM_LEAD_MEDIA_TYPES as readonly string[]).includes(type)) {
    bad('Upload a PNG, JPG, WebP, GIF or SVG image');
  }
  return type;
}

const fileFields = (input: LeadMediaInput) => ({
  url: httpsUrl(input.url),
  mime_type: mimeType(input.mime_type),
  size_bytes: positiveOrNull(input.size_bytes),
  width: positiveOrNull(input.width),
  height: positiveOrNull(input.height),
});

const cleanName = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 120) : '');

/** A stored row, as lean() returns it. */
interface MediaRow {
  _id: unknown;
  entity_type: string;
  lead_id: unknown;
  kind: string;
  url: string;
  name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
  sort_order?: number | null;
  uploaded_by?: string | null;
  created_at?: unknown;
  updated_at?: unknown;
}

const pub = (d: MediaRow) => ({
  id: String(d._id),
  entity_type: d.entity_type,
  lead_id: String(d.lead_id),
  kind: d.kind,
  url: d.url,
  name: d.name ?? '',
  mime_type: d.mime_type ?? '',
  size_bytes: d.size_bytes ?? null,
  width: d.width ?? null,
  height: d.height ?? null,
  sort_order: d.sort_order ?? 0,
  uploaded_by: d.uploaded_by ?? null,
  created_at: iso(d.created_at),
  updated_at: iso(d.updated_at),
});

async function assertLeadExists(type: CrmLeadEntityType, leadId: Types.ObjectId) {
  const exists = await LEAD_MODELS[type].exists({ _id: leadId });
  if (!exists) notFound('Lead not found');
}

const listFor = async (type: CrmLeadEntityType, leadId: Types.ObjectId) =>
  (
    await CrmLeadMediaModel.find({ entity_type: type, lead_id: leadId })
      // LOGO before IMAGE: descending, because the kinds sort alphabetically the other way.
      .sort({ kind: -1, sort_order: 1, created_at: 1 })
      .lean()
  ).map(pub);

export const leadMediaService = {
  async list(entity: string, leadIdRaw: string) {
    const type = entityType(entity);
    return listFor(type, objectId(leadIdRaw, 'Lead'));
  },

  /** Add uploaded files to a lead; returns the lead's whole list so the page refreshes in one round trip. */
  async add(entity: string, leadIdRaw: string, items: LeadMediaInput[], by?: string | null) {
    const type = entityType(entity);
    const leadId = objectId(leadIdRaw, 'Lead');
    if (!items?.length) bad('Add at least one image');
    await assertLeadExists(type, leadId);
    const docs = items.map((item) => ({ kind: mediaKind(item.kind), name: cleanName(item.name), ...fileFields(item) }));

    for (const kind of CRM_LEAD_MEDIA_KINDS) {
      const adding = docs.filter((d) => d.kind === kind).length;
      if (!adding) continue;
      const have = await CrmLeadMediaModel.countDocuments({ entity_type: type, lead_id: leadId, kind });
      if (have + adding > CRM_LEAD_MEDIA_LIMITS[kind]) {
        bad(`A lead can hold up to ${CRM_LEAD_MEDIA_LIMITS[kind]} ${kind === 'LOGO' ? 'logos' : 'images'}`);
      }
    }
    const last = await CrmLeadMediaModel.findOne({ entity_type: type, lead_id: leadId })
      .sort({ sort_order: -1 })
      .select('sort_order')
      .lean();
    const start = (last?.sort_order ?? -1) + 1;
    await CrmLeadMediaModel.insertMany(
      docs.map((d, i) => ({ ...d, entity_type: type, lead_id: leadId, sort_order: start + i, uploaded_by: by ?? null }))
    );
    return listFor(type, leadId);
  },

  /** Rename, re-file (logo ↔ image) or replace the file of one item. */
  async update(idRaw: string, input: LeadMediaInput) {
    const id = objectId(idRaw, 'Image');
    const $set: Record<string, unknown> = {};
    if (input.name != null) $set.name = cleanName(input.name);
    if (input.url != null) Object.assign($set, fileFields(input));
    if (input.kind != null) {
      const kind = mediaKind(input.kind);
      const current = await CrmLeadMediaModel.findById(id).lean();
      if (!current) notFound('Image not found');
      if (current.kind !== kind) {
        const have = await CrmLeadMediaModel.countDocuments({ entity_type: current.entity_type, lead_id: current.lead_id, kind });
        if (have >= CRM_LEAD_MEDIA_LIMITS[kind]) {
          bad(`A lead can hold up to ${CRM_LEAD_MEDIA_LIMITS[kind]} ${kind === 'LOGO' ? 'logos' : 'images'}`);
        }
      }
      $set.kind = kind;
    }
    if (Object.keys($set).length === 0) bad('Nothing to change');
    const doc = await CrmLeadMediaModel.findByIdAndUpdate(id, { $set }, { new: true }).lean();
    if (!doc) notFound('Image not found');
    return pub(doc);
  },

  async remove(idRaw: string) {
    const res = await CrmLeadMediaModel.deleteOne({ _id: objectId(idRaw, 'Image') });
    if (res.deletedCount === 0) notFound('Image not found');
    return true;
  },

};
