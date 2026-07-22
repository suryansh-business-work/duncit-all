import { GraphQLError } from 'graphql';
import { ApprovalRequestModel, type ApprovalStatus } from './approval.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    type: o.type,
    status: o.status ?? 'PENDING',
    source_portal: o.source_portal ?? '',
    title: o.title ?? '',
    summary: o.summary ?? '',
    details: (o.details ?? []).map((d: any) => ({ label: d.label, value: d.value ?? '' })),
    kind: o.kind ?? null,
    target_id: o.target_id ?? null,
    payload: o.payload ?? null,
    subject_user_id: o.subject_user_id ? String(o.subject_user_id) : null,
    subject_name: o.subject_name ?? null,
    subject_email: o.subject_email ?? null,
    subject_phone: o.subject_phone ?? null,
    meeting_id: o.meeting_id ? String(o.meeting_id) : null,
    requested_by_name: o.requested_by_name ?? null,
    reviewed_by_name: o.reviewed_by_name ?? null,
    reviewed_at: iso(o.reviewed_at),
    review_notes: o.review_notes ?? null,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

const notFound = () => new GraphQLError('Request not found', { extensions: { code: 'NOT_FOUND' } });

/** Allowlists for the shared table engine (approvalRequestsTable — DUNCIT TABLE CONTRACT v1). */
const APPROVAL_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'summary', 'subject_name', 'subject_email', 'requested_by_name'],
  sortFields: {
    type: 'type',
    status: 'status',
    kind: 'kind',
    source_portal: 'source_portal',
    subject_name: 'subject_name',
    requested_by_name: 'requested_by_name',
    reviewed_at: 'reviewed_at',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    type: { type: 'enum' },
    kind: { type: 'string' },
    source_portal: { type: 'string' },
    reviewed_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export interface EcommChangeInput {
  kind: string;
  target_id: string;
  target_name: string;
  summary?: string | null;
  details: { label: string; value?: string | null }[];
  payload: string;
}

interface Reviewer {
  id?: string | null;
  name?: string | null;
}

/** Apply an approved ecomm change-request's payload to its brand/product. The
 * payload is a JSON object of the fields the requester proposed; on approval we
 * $set exactly those fields on the target (Task B item 2). Best-effort — a bad
 * payload never blocks the approval decision. */
async function applyEcommChange(doc: any) {
  try {
    const changes = JSON.parse(doc.payload || '{}');
    if (!doc.target_id || typeof changes !== 'object' || Array.isArray(changes)) return;
    if (doc.type === 'ECOMM_PRODUCT_CHANGE') {
      const { InventoryProductModel } = await import('@modules/venues/inventory/inventory.model');
      await InventoryProductModel.findByIdAndUpdate(doc.target_id, { $set: changes });
    } else if (doc.type === 'ECOMM_BRAND_CHANGE') {
      const { EcommBrandModel } = await import('@modules/venues/ecommBrand/ecommBrand.model');
      // A payload may not silently flip the review status: brand approval must
      // run the real approve path so the owner also gets the e-commerce role.
      const { status, ...rest } = changes as Record<string, unknown>;
      if (Object.keys(rest).length > 0) {
        await EcommBrandModel.findByIdAndUpdate(doc.target_id, { $set: rest });
      }
      if (status === 'APPROVED') {
        const { ecommBrandService } = await import('@modules/venues/ecommBrand/ecommBrand.service');
        await ecommBrandService.approve(String(doc.target_id));
      }
    }
  } catch (err) {
    logs.server.error('approval', 'applyEcommChange', {
      error: err,
      msg: 'applyEcommChange failed',
      target_id: doc?.target_id ?? null,
      type: doc?.type ?? null,
    });
  }
}

export const approvalService = {
  async list(filter: { status?: ApprovalStatus | null; type?: string | null } = {}) {
    const q: any = {};
    if (filter.status) q.status = filter.status;
    if (filter.type) q.type = filter.type;
    const docs = await ApprovalRequestModel.find(q).sort({ created_at: -1 });
    return docs.map(pub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the approvalRequestsTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery(
      ApprovalRequestModel,
      {},
      input,
      APPROVAL_TABLE_CONFIG
    );
    return { rows: docs.map(pub), total, page, page_size };
  },

  /** Products portal: list brand/product change requests (optionally by kind). */
  async listEcommChanges(kind?: string | null) {
    const upper = String(kind ?? '').toUpperCase();
    let types = ['ECOMM_BRAND_CHANGE', 'ECOMM_PRODUCT_CHANGE'];
    if (upper === 'BRAND') types = ['ECOMM_BRAND_CHANGE'];
    else if (upper === 'PRODUCT') types = ['ECOMM_PRODUCT_CHANGE'];
    const docs = await ApprovalRequestModel.find({ type: { $in: types } }).sort({ created_at: -1 });
    return docs.map(pub);
  },

  /** Products portal: raise a brand/product change request for admin approval. */
  async submitEcommChange(input: EcommChangeInput, requester: Reviewer) {
    const kind = String(input.kind).toUpperCase() === 'BRAND' ? 'BRAND' : 'PRODUCT';
    const type = kind === 'BRAND' ? 'ECOMM_BRAND_CHANGE' : 'ECOMM_PRODUCT_CHANGE';
    const label = kind === 'BRAND' ? 'brand' : 'product';
    const doc = await ApprovalRequestModel.create({
      type,
      source_portal: 'products',
      title: `${kind === 'BRAND' ? 'Brand' : 'Product'} change — ${input.target_name}`,
      summary: input.summary ?? `Proposed changes to the ${label} "${input.target_name}".`,
      details: (input.details ?? []).map((d) => ({ label: d.label, value: d.value ?? '' })),
      target_id: input.target_id,
      payload: input.payload,
      requested_by: requester.id ?? null,
      requested_by_name: requester.name ?? null,
    });
    return pub(doc);
  },

  async approve(id: string, reviewer: Reviewer, notes?: string | null) {
    const doc = await ApprovalRequestModel.findById(id);
    if (!doc) throw notFound();
    if (doc.status !== 'PENDING') {
      throw new GraphQLError('This request has already been reviewed', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    doc.status = 'APPROVED';
    doc.reviewed_by = reviewer.id ?? null;
    doc.reviewed_by_name = reviewer.name ?? null;
    doc.reviewed_at = new Date();
    doc.review_notes = notes ?? null;
    await doc.save();
    if (doc.type === 'ECOMM_BRAND_CHANGE' || doc.type === 'ECOMM_PRODUCT_CHANGE') {
      await applyEcommChange(doc);
    }
    return pub(doc);
  },

  async deny(id: string, reviewer: Reviewer, notes?: string | null) {
    const doc = await ApprovalRequestModel.findById(id);
    if (!doc) throw notFound();
    if (doc.status !== 'PENDING') {
      throw new GraphQLError('This request has already been reviewed', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    doc.status = 'DENIED';
    doc.reviewed_by = reviewer.id ?? null;
    doc.reviewed_by_name = reviewer.name ?? null;
    doc.reviewed_at = new Date();
    doc.review_notes = notes ?? null;
    await doc.save();
    return pub(doc);
  },
};
