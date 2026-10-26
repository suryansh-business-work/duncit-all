import { GraphQLError } from 'graphql';
import { isObjectIdOrHexString, Types } from 'mongoose';
import { ROLE_ASSIGNERS } from '@modules/access/user/user.constants';
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
    // The id the ApprovalRequest field resolver turns into a name.
    reviewed_by: o.reviewed_by ?? null,
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
    // Portal Access rows: the requested portal's key.
    portal: 'target_id',
    reviewed_at: 'reviewed_at',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    type: { type: 'string' },
    kind: { type: 'string' },
    source_portal: { type: 'string' },
    subject_name: { type: 'string' },
    requested_by_name: { type: 'string' },
    portal: { path: 'target_id', type: 'string' },
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
  /** The reviewer's roles — needed to approve a request that grants one. */
  roles?: readonly string[];
}

type Decision = 'APPROVED' | 'DENIED';

/** The fields of a request the decision rules read. */
interface DecidedRequest {
  _id: Types.ObjectId;
  type: string;
  requested_by?: string | null;
  subject_user_id?: Types.ObjectId | null;
  target_id?: string | null;
}

const alreadyReviewed = () =>
  new GraphQLError('This request has already been reviewed', { extensions: { code: 'BAD_USER_INPUT' } });

const forbidden = (message: string) => new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });

/** The reviewer raised this request, or it is about them (a Portal Access request's member). */
const isOwnRequest = (doc: DecidedRequest, reviewerId: string) =>
  doc.requested_by === reviewerId || doc.subject_user_id?.toHexString() === reviewerId;

/** The same rule as a filter, so a raced check can never let a requester write their own decision. */
function notOwnFilter(reviewerId: string): Record<string, unknown> {
  const filter: Record<string, unknown> = { requested_by: { $ne: reviewerId } };
  if (isObjectIdOrHexString(reviewerId)) filter.subject_user_id = { $ne: new Types.ObjectId(reviewerId) };
  return filter;
}

/** A refused decision is logged: it is exactly what an audit of this inbox wants to find. */
function refuse(doc: DecidedRequest, reviewer: Reviewer, decision: Decision, msg: string, extra: Record<string, unknown> = {}) {
  logs.server.warn('approval', 'decide', {
    msg,
    requestId: String(doc._id),
    type: doc.type,
    reviewerId: reviewer.id ?? null,
    decision,
    ...extra,
  });
}

/**
 * Who may decide this request. Nobody decides their own — a City Admin
 * approving its own Portal Access request would hand itself that console's
 * role. And approving a request that grants a role takes the authority that
 * grants the role directly (ROLE_ASSIGNERS), so the inbox is never a way
 * round the role mutations. Denying grants nothing, so it needs no more.
 */
async function assertMayDecide(doc: DecidedRequest, reviewer: Reviewer, decision: Decision) {
  if (decision !== 'APPROVED') return; // Denying your own request grants nothing — it is a withdrawal.
  if (reviewer.id && isOwnRequest(doc, reviewer.id)) {
    refuse(doc, reviewer, decision, 'self-review refused');
    throw forbidden('You cannot approve your own request. Another admin has to review it');
  }
  if (doc.type !== 'PORTAL_ACCESS') return;
  const { portalAccessService } = await import('@modules/portals/portalAccess.service');
  const role = portalAccessService.grantedRole(doc);
  if (!role || (reviewer.roles ?? []).some((r) => ROLE_ASSIGNERS.includes(r))) return;
  refuse(doc, reviewer, decision, 'role grant refused', { role });
  throw forbidden(`Only a Super Admin can approve access that grants the ${role} role`);
}

/** Record the decision once: the status and the not-own rule are both in the update filter. */
async function decide(id: string, reviewer: Reviewer, decision: Decision, notes?: string | null) {
  const existing = await ApprovalRequestModel.findById(id);
  if (!existing) throw notFound();
  if (existing.status !== 'PENDING') throw alreadyReviewed();
  await assertMayDecide(existing, reviewer, decision);
  const doc = await ApprovalRequestModel.findOneAndUpdate(
    { _id: existing._id, status: 'PENDING', ...(reviewer.id && decision === 'APPROVED' ? notOwnFilter(reviewer.id) : {}) },
    {
      $set: {
        status: decision,
        reviewed_by: reviewer.id ?? null,
        reviewed_at: new Date(),
        review_notes: notes ?? null,
      },
    },
    { new: true }
  );
  if (!doc) throw alreadyReviewed();
  return doc;
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
        // Loaded and saved (not findByIdAndUpdate) so the model re-derives
        // `live` — a change that pauses the brand must take it off the shop.
        const brand = await EcommBrandModel.findById(doc.target_id);
        if (brand) {
          brand.set(rest);
          await brand.save();
        }
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

/** Portal-access decision: approval grants the portal's role + emails the
 * requester; denial only emails. Lives in the portals module; best-effort. */
async function applyPortalAccessDecision(doc: any, status: 'APPROVED' | 'DENIED') {
  try {
    const { portalAccessService } = await import('@modules/portals/portalAccess.service');
    await portalAccessService.applyDecision(doc, status);
  } catch (err) {
    logs.server.error('approval', 'applyPortalAccessDecision', {
      error: err,
      msg: 'applyPortalAccessDecision failed',
      target_id: doc?.target_id ?? null,
    });
  }
}

/**
 * An approved warehouse goes to ShipRocket there and then — approval is the
 * gate it was waiting behind, and nothing ships from an address the courier
 * does not hold. A refusal does not undo the approval: the reason is recorded
 * on the warehouse (shiprocket_error) for both portals, and the partner's
 * warehouse page sends it again on its next load.
 */
async function registerApprovedWarehouse(warehouseId: string) {
  try {
    const { brandPickupLocationService } = await import(
      '@modules/venues/brandPickupLocation/brandPickupLocation.service'
    );
    await brandPickupLocationService.registerWithShiprocket(warehouseId);
  } catch (err) {
    logs.server.warn('approval', 'registerApprovedWarehouse', {
      error: err,
      msg: 'approved warehouse was not registered with ShipRocket',
      target_id: warehouseId,
    });
  }
}

/** Apply a warehouse-approval decision to its BrandPickupLocation: APPROVED makes
 * it usable and sends it to ShipRocket, REJECTED keeps it blocked. Best-effort —
 * never blocks the decision. */
async function applyWarehouseReview(doc: any, status: 'APPROVED' | 'REJECTED') {
  if (!doc.target_id) return;
  try {
    const { BrandPickupLocationModel } = await import(
      '@modules/venues/brandPickupLocation/brandPickupLocation.model'
    );
    const updated = await BrandPickupLocationModel.findByIdAndUpdate(doc.target_id, { $set: { review_status: status } });
    if (updated && status === 'APPROVED') await registerApprovedWarehouse(String(updated.id));
  } catch (err) {
    logs.server.error('approval', 'applyWarehouseReview', {
      error: err,
      msg: 'applyWarehouseReview failed',
      target_id: doc?.target_id ?? null,
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

  /** Products portal: list warehouse-approval requests (optionally by status). */
  async listWarehouseApprovals(status?: ApprovalStatus | null) {
    const q: any = { type: 'WAREHOUSE_APPROVAL' };
    if (status) q.status = status;
    const docs = await ApprovalRequestModel.find(q).sort({ created_at: -1 });
    return docs.map(pub);
  },

  /** Partner save raised this: one PENDING request per warehouse — a re-save
   * supersedes the previous pending request. Called from brandPickupLocation. */
  async submitWarehouseApproval(targetId: string, targetName: string, isEdit: boolean, requestedById: string) {
    await ApprovalRequestModel.deleteMany({
      type: 'WAREHOUSE_APPROVAL',
      target_id: targetId,
      status: 'PENDING',
    });
    const verb = isEdit ? 'Updated' : 'New';
    const doc = await ApprovalRequestModel.create({
      type: 'WAREHOUSE_APPROVAL',
      source_portal: 'partners',
      title: `Pickup address approval — ${targetName}`,
      summary: `${verb} pickup address "${targetName}" is awaiting approval before it can be used for shipping.`,
      details: [{ label: 'Pickup address', value: targetName }],
      target_id: targetId,
      requested_by: requestedById,
    });
    return pub(doc);
  },

  /** Products portal review of a warehouse request (type-guarded so the products
   * reviewer role can't touch ecomm/other requests via this path). */
  async reviewWarehouse(id: string, decision: 'APPROVE' | 'DENY', reviewer: Reviewer, notes?: string | null) {
    const existing = await ApprovalRequestModel.findById(id);
    if (!existing) throw notFound();
    if (existing.type !== 'WAREHOUSE_APPROVAL') {
      throw new GraphQLError('Not a pickup address approval request', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    return decision === 'APPROVE' ? this.approve(id, reviewer, notes) : this.deny(id, reviewer, notes);
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
    const doc = await decide(id, reviewer, 'APPROVED', notes);
    if (doc.type === 'ECOMM_BRAND_CHANGE' || doc.type === 'ECOMM_PRODUCT_CHANGE') {
      await applyEcommChange(doc);
    } else if (doc.type === 'PORTAL_ACCESS') {
      await applyPortalAccessDecision(doc, 'APPROVED');
    } else {
      // The only other type today is WAREHOUSE_APPROVAL; applyWarehouseReview
      // no-ops unless the request carries a warehouse target_id.
      await applyWarehouseReview(doc, 'APPROVED');
    }
    return pub(doc);
  },

  async deny(id: string, reviewer: Reviewer, notes?: string | null) {
    const doc = await decide(id, reviewer, 'DENIED', notes);
    if (doc.type === 'WAREHOUSE_APPROVAL') {
      await applyWarehouseReview(doc, 'REJECTED');
    } else if (doc.type === 'PORTAL_ACCESS') {
      await applyPortalAccessDecision(doc, 'DENIED');
    }
    return pub(doc);
  },
};
