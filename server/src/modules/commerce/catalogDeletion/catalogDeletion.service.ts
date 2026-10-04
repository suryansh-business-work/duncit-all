import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { appDate } from '@utils/app-time';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { EcommBrandModel, type IEcommBrand } from '@modules/venues/ecommBrand/ecommBrand.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import {
  CatalogDeletionRequestModel,
  OPEN_DELETION_STATUSES,
  type DeletionKind,
  type DeletionMode,
  type ICatalogDeletionRequest,
} from './catalogDeletion.model';
import { countOpenWork, deletionImpact, liveBrandProducts, type DeletionTarget } from './catalogDeletion.impact';
import { deletionWindow, scheduledInstant } from './catalogDeletion.window';
import { notifyDeletionUpdate } from './catalogDeletion.notify';
import { cancelRunningOrders } from './catalogDeletion.orders';
import { toDeletionPub } from './catalogDeletion.pub';

/**
 * Brand and product deletion requests: the partner raises one (Partners
 * portal), the Products team reviews it (Products portal › Delete Requests),
 * and the scheduler carries it out on the chosen date once nothing is running
 * (catalogDeletion.executor).
 */

export interface DeletionRequestInput {
  kind: DeletionKind;
  /** The product's id for PRODUCT, the brand's for BRAND. */
  target_id: string;
  mode: DeletionMode;
  /** yyyy-MM-dd inside the notice window. */
  scheduled_for: string;
  reason?: string | null;
}

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_REQUEST' } });
}
function notFound(what: string): never {
  throw new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
}

const oid = (id: string, what: string) => (Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : notFound(what));
const newRequestNo = () => `DEL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const event = (action: string, note: string, by: string) => ({ action, note, by, at: new Date() });

/** A brand the partner owns. */
async function ownedBrand(userId: string, brandId: Types.ObjectId): Promise<IEcommBrand> {
  const brand = await EcommBrandModel.findOne({ _id: brandId, owner_user_id: new Types.ObjectId(userId) });
  return brand ?? notFound('Brand');
}

/** The brand + product a partner may ask to delete, checked against ownership and state. */
async function resolveTarget(userId: string, kind: DeletionKind, targetId: string) {
  if (kind === 'BRAND') {
    const brand = await ownedBrand(userId, oid(targetId, 'Brand'));
    if (brand.status !== 'APPROVED') bad('This brand never went on sale — delete it directly instead');
    return { brand, product: null };
  }
  const product = await InventoryProductModel.findById(oid(targetId, 'Product'));
  if (!product?.brand_id || product.ownership !== 'BRAND') return notFound('Product');
  const brand = await ownedBrand(userId, product.brand_id);
  if (product.status === 'ARCHIVED') bad('This product is already deleted');
  if (product.listing_review_status !== 'APPROVED') bad('This product was never on sale — delete it directly instead');
  const parent = await CatalogDeletionRequestModel.exists({
    kind: 'BRAND',
    brand_id: brand._id,
    open: true,
  });
  if (parent) bad('The whole brand is already being deleted — this product goes with it');
  return { brand, product };
}

/** Off the shop at once — no new orders while the request runs. Answers whether it was on sale. */
async function hideProduct(productId: Types.ObjectId): Promise<boolean> {
  const before = await InventoryProductModel.findOneAndUpdate(
    { _id: productId },
    { $set: { is_active: false } },
    { new: false }
  ).select('is_active');
  return before?.is_active !== false;
}

/** Back on the shop when a request is rejected or withdrawn — only if it was on sale before. */
async function restoreVisibility(req: ICatalogDeletionRequest) {
  if (!req.was_active) return;
  if (req.kind === 'PRODUCT' && req.product_id) {
    await InventoryProductModel.updateOne({ _id: req.product_id, status: { $ne: 'ARCHIVED' } }, { $set: { is_active: true } });
  } else {
    await EcommBrandModel.updateOne({ _id: req.brand_id }, { $set: { is_active: true } });
  }
}

/** Close a request (and, for a brand, every product request raised under it). */
async function closeRequest(req: ICatalogDeletionRequest, status: 'REJECTED' | 'WITHDRAWN', note: string, by: string) {
  const children = req.kind === 'BRAND'
    ? await CatalogDeletionRequestModel.find({ parent_id: req._id, open: true })
    : [];
  for (const doc of [req, ...children]) {
    doc.status = status;
    doc.open = false;
    doc.events.push(event(status, note, by));
    if (status === 'REJECTED') {
      doc.reviewed_by = by;
      doc.reviewed_at = new Date();
      doc.review_note = note;
    }
    await doc.save();
    await restoreVisibility(doc);
  }
}

const isDuplicate = (error: unknown) => (error as { code?: number })?.code === 11000;

const DELETION_TABLE: TableEntityConfig = {
  searchFields: ['request_no', 'brand_name', 'product_name', 'requested_by_name'],
  sortFields: {
    request_no: 'request_no',
    brand_name: 'brand_name',
    product_name: 'product_name',
    status: 'status',
    mode: 'mode',
    scheduled_for: 'scheduled_for',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    mode: { type: 'enum' },
    brand_id: { type: 'string' },
    brand_name: { type: 'string' },
    product_name: { type: 'string' },
    scheduled_for: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export const catalogDeletionService = {
  window: () => deletionWindow(),

  /** Everything the partner's warning shows before they confirm. */
  async preview(userId: string, kind: DeletionKind, targetId: string) {
    const { brand, product } = await resolveTarget(userId, kind, targetId);
    const target: DeletionTarget = { kind, brandId: brand._id as Types.ObjectId, productId: product?._id as Types.ObjectId };
    return {
      kind,
      brand_name: brand.brand_name ?? '',
      product_name: product?.product_name ?? '',
      window: await deletionWindow(),
      impact: await deletionImpact(target),
    };
  },

  async request(userId: string, input: DeletionRequestInput) {
    const { brand, product } = await resolveTarget(userId, input.kind, input.target_id);
    if (input.mode !== 'WAIT_FOR_ORDERS' && input.mode !== 'CANCEL_AND_REFUND') bad('Choose what happens to running orders');
    const scheduledFor = await scheduledInstant(input.scheduled_for);
    const brandId = brand._id as Types.ObjectId;
    const target: DeletionTarget = { kind: input.kind, brandId, productId: (product?._id as Types.ObjectId) ?? null };
    const { orders } = await countOpenWork(target);
    const base = {
      brand_id: brandId,
      brand_name: brand.brand_name ?? '',
      mode: input.mode,
      reason: String(input.reason ?? '').trim().slice(0, 1000),
      scheduled_for: scheduledFor,
      requested_by_id: userId,
      requested_by_name: brand.contact_person ?? '',
    };
    const by = brand.contact_person || 'Partner';
    let req: ICatalogDeletionRequest;
    try {
      req = await CatalogDeletionRequestModel.create({
        ...base,
        request_no: newRequestNo(),
        kind: input.kind,
        product_id: product?._id ?? null,
        product_name: product?.product_name ?? '',
        open_orders_at_request: orders,
        was_active: input.kind === 'BRAND' ? brand.is_active !== false : product?.is_active !== false,
        events: [event('REQUESTED', `Delete on ${appDate(scheduledFor)}; running orders: ${input.mode}`, by)],
      });
    } catch (error) {
      if (isDuplicate(error)) bad('A deletion request for this is already open');
      throw error;
    }
    if (input.kind === 'PRODUCT' && product) {
      await hideProduct(product._id as Types.ObjectId);
    } else {
      await EcommBrandModel.updateOne({ _id: brandId }, { $set: { is_active: false } });
      // One request per product, so the Products team reviews each in the same queue.
      for (const p of await liveBrandProducts(brandId)) {
        const pid = p._id as Types.ObjectId;
        const own = await CatalogDeletionRequestModel.findOne({ kind: 'PRODUCT', product_id: pid, open: true });
        if (own) {
          // Already being deleted on its own: fold it under the brand's request.
          own.parent_id = req._id as Types.ObjectId;
          own.events.push(event('LINKED', `Now part of brand request ${req.request_no}`, by));
          await own.save();
          continue;
        }
        const wasActive = await hideProduct(pid);
        const units = await countOpenWork({ kind: 'PRODUCT', brandId, productId: pid });
        await CatalogDeletionRequestModel.create({
          ...base,
          request_no: newRequestNo(),
          kind: 'PRODUCT',
          product_id: pid,
          product_name: p.product_name,
          parent_id: req._id,
          open_orders_at_request: units.orders,
          was_active: wasActive,
          events: [event('REQUESTED', `Part of brand request ${req.request_no}`, by)],
        });
      }
    }
    logs.server.info('catalogDeletion', 'request', {
      request_no: req.request_no,
      kind: req.kind,
      brand_id: String(brandId),
      product_id: product ? String(product._id) : undefined,
      mode: req.mode,
      open_orders: orders,
    });
    return toDeletionPub(req);
  },

  async withdraw(userId: string, id: string) {
    const req = await CatalogDeletionRequestModel.findById(oid(id, 'Request'));
    if (!req) return notFound('Request');
    await ownedBrand(userId, req.brand_id);
    if (!OPEN_DELETION_STATUSES.includes(req.status)) bad('This request is already closed');
    if (req.parent_id) bad('This product is part of a brand deletion — withdraw the brand request instead');
    await closeRequest(req, 'WITHDRAWN', 'Withdrawn by the partner', req.requested_by_name || 'Partner');
    logs.server.info('catalogDeletion', 'withdraw', { request_no: req.request_no });
    return toDeletionPub(req);
  },

  /** A partner's requests (open and recent) — what their brand and product rows show. */
  async mine(userId: string, brandId?: string | null) {
    const brands = await EcommBrandModel.find({ owner_user_id: new Types.ObjectId(userId) }).select('_id').lean();
    const ids = brands.map((b) => b._id).filter((b) => !brandId || String(b) === brandId);
    const docs = await CatalogDeletionRequestModel.find({ brand_id: { $in: ids } }).sort({ created_at: -1 }).limit(500);
    return docs.map(toDeletionPub);
  },

  async table(kind: DeletionKind, query?: TableQueryInput | null, parentId?: string | null) {
    const base: Record<string, unknown> = { kind };
    if (parentId && Types.ObjectId.isValid(parentId)) base.parent_id = new Types.ObjectId(parentId);
    const { docs, total, page, page_size } = await runTableQuery<ICatalogDeletionRequest>(
      CatalogDeletionRequestModel,
      base,
      query,
      DELETION_TABLE
    );
    return { rows: docs.map(toDeletionPub), total, page, page_size };
  },

  async detail(id: string) {
    const req = await CatalogDeletionRequestModel.findById(oid(id, 'Request'));
    if (!req) return notFound('Request');
    const impact = await deletionImpact({ kind: req.kind, brandId: req.brand_id, productId: req.product_id });
    return { request: toDeletionPub(req), impact };
  },

  /** Products team: approve (and, under CANCEL_AND_REFUND, cancel what is running) or reject. */
  async review(id: string, approve: boolean, note: string, by: string) {
    const req = await CatalogDeletionRequestModel.findById(oid(id, 'Request'));
    if (!req) return notFound('Request');
    if (req.status !== 'PENDING') bad('Only a pending request can be reviewed');
    if (req.parent_id) bad('This product is part of a brand request — review the brand request');
    const text = String(note ?? '').trim().slice(0, 2000);
    if (!approve) {
      if (!text) bad('Tell the partner why the request is rejected');
      await closeRequest(req, 'REJECTED', text, by);
      await notifyDeletionUpdate(req, 'rejected — it is back on sale', text);
      logs.server.info('catalogDeletion', 'reject', { request_no: req.request_no, by });
      return toDeletionPub(req);
    }
    const children = req.kind === 'BRAND' ? await CatalogDeletionRequestModel.find({ parent_id: req._id, status: 'PENDING' }) : [];
    for (const doc of [req, ...children]) {
      doc.status = 'APPROVED';
      doc.reviewed_by = by;
      doc.reviewed_at = new Date();
      doc.review_note = text;
      doc.events.push(event('APPROVED', text, by));
      await doc.save();
    }
    await notifyDeletionUpdate(req, `approved — it will be deleted on or after ${appDate(req.scheduled_for)}`, text);
    logs.server.info('catalogDeletion', 'approve', { request_no: req.request_no, by, mode: req.mode });
    if (req.mode === 'CANCEL_AND_REFUND') {
      // Razorpay is called once per order — far longer than a request should
      // wait. The executor picks up anything a restart leaves behind.
      cancelRunningOrders(req, by).catch((error) =>
        logs.server.error('catalogDeletion', 'cancelRunningOrders', { error, request_no: req.request_no })
      );
    }
    return toDeletionPub(req);
  },
};
