import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A partner's request to delete a live brand or product from the pod shop.
 *
 * A live listing may have orders running, so it is never deleted on the spot:
 * the partner sees what is running, picks what happens to those orders and a
 * date inside the notice window (Products portal › Delete Requests › Settings),
 * and the item leaves the shop at once (no new orders). The Products team
 * approves or rejects; on the chosen date the deletion runs — but only once
 * every order and return on it is settled.
 *
 * A brand request carries one child PRODUCT request per product it still sells
 * (`parent_id`), so the Products team sees each product in the same queue and
 * the brand can only go once all of them have.
 */
export type DeletionKind = 'PRODUCT' | 'BRAND';
/** What happens to orders still running: wait for them to be delivered, or cancel and refund them in full. */
export type DeletionMode = 'WAIT_FOR_ORDERS' | 'CANCEL_AND_REFUND';
export type DeletionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'COMPLETED';

export const DELETION_KINDS: DeletionKind[] = ['PRODUCT', 'BRAND'];
export const DELETION_MODES: DeletionMode[] = ['WAIT_FOR_ORDERS', 'CANCEL_AND_REFUND'];
export const DELETION_STATUSES: DeletionStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'COMPLETED'];
/** A request still in play — one per item at a time. */
export const OPEN_DELETION_STATUSES: DeletionStatus[] = ['PENDING', 'APPROVED'];

export interface IDeletionEvent {
  action: string;
  note: string;
  by: string;
  at: Date;
}

export interface ICatalogDeletionRequest extends Document {
  request_no: string;
  kind: DeletionKind;
  brand_id: Types.ObjectId;
  /** Null on a BRAND request. */
  product_id: Types.ObjectId | null;
  /** The BRAND request a PRODUCT request was raised under. */
  parent_id: Types.ObjectId | null;
  brand_name: string;
  product_name: string;
  mode: DeletionMode;
  reason: string;
  /** The day the partner picked — the deletion runs on/after it, once nothing is running. */
  scheduled_for: Date;
  status: DeletionStatus;
  /** True while PENDING/APPROVED — the unique index keeps one open request per item. */
  open: boolean;
  /** Was the item on sale when the request hid it — restored on reject/withdraw. */
  was_active: boolean;
  /** What was running when the partner asked, shown to the Products team. */
  open_orders_at_request: number;
  requested_by_id: string;
  requested_by_name: string;
  reviewed_by: string;
  reviewed_at: Date | null;
  review_note: string;
  /** Orders cancelled under CANCEL_AND_REFUND, and how many of their refunds Razorpay refused. */
  cancelled_orders: number;
  failed_refunds: number;
  /** Why the scheduled deletion has not run yet ("3 orders still running"). */
  blocked_reason: string;
  last_checked_at: Date | null;
  completed_at: Date | null;
  events: IDeletionEvent[];
  created_at: Date;
  updated_at: Date;
}

const eventSchema = new Schema<IDeletionEvent>(
  {
    action: { type: String, required: true },
    note: { type: String, default: '', maxlength: 1000 },
    by: { type: String, default: '' },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const catalogDeletionSchema = new Schema<ICatalogDeletionRequest>(
  {
    request_no: { type: String, required: true, unique: true },
    kind: { type: String, enum: DELETION_KINDS, required: true, index: true },
    brand_id: { type: Schema.Types.ObjectId, ref: 'EcommBrand', required: true, index: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', default: null, index: true },
    parent_id: { type: Schema.Types.ObjectId, ref: 'CatalogDeletionRequest', default: null, index: true },
    brand_name: { type: String, default: '' },
    product_name: { type: String, default: '' },
    mode: { type: String, enum: DELETION_MODES, required: true },
    reason: { type: String, default: '', trim: true, maxlength: 1000 },
    scheduled_for: { type: Date, required: true },
    status: { type: String, enum: DELETION_STATUSES, default: 'PENDING', index: true },
    open: { type: Boolean, default: true },
    was_active: { type: Boolean, default: true },
    open_orders_at_request: { type: Number, default: 0, min: 0 },
    requested_by_id: { type: String, default: '' },
    requested_by_name: { type: String, default: '' },
    reviewed_by: { type: String, default: '' },
    reviewed_at: { type: Date, default: null },
    review_note: { type: String, default: '', trim: true, maxlength: 2000 },
    cancelled_orders: { type: Number, default: 0, min: 0 },
    failed_refunds: { type: Number, default: 0, min: 0 },
    blocked_reason: { type: String, default: '' },
    last_checked_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
    events: { type: [eventSchema], default: [] },
  },
  { collection: 'catalogdeletionrequests', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One open request per item: (PRODUCT, product) or (BRAND, brand). Two partners
// pressing at once — or a double click — cannot open a second one.
catalogDeletionSchema.index(
  { kind: 1, brand_id: 1, product_id: 1 },
  { unique: true, partialFilterExpression: { open: true } }
);
// The executor's sweep: approved requests whose date has come.
catalogDeletionSchema.index({ status: 1, scheduled_for: 1 });

export const CatalogDeletionRequestModel = model<ICatalogDeletionRequest>(
  'CatalogDeletionRequest',
  catalogDeletionSchema
);

/* ------------------------------------------------------------------ *
 * Products portal › Delete Requests › Settings — one document.
 * ------------------------------------------------------------------ */

export interface ICatalogDeletionSettings extends Document {
  singleton_key: string;
  /** Earliest a deletion can be scheduled, in days from the request. */
  min_days: number;
  /** Latest a deletion can be scheduled, in days from the request. */
  max_days: number;
  updated_by: string;
  updated_at: Date;
}

/** Bounds every write is clamped to — the portal form validates the same. */
export const DELETION_WINDOW_BOUNDS = { min: 1, max: 365, defaultMin: 30, defaultMax: 60 } as const;

const settingsSchema = new Schema<ICatalogDeletionSettings>(
  {
    singleton_key: { type: String, required: true, unique: true },
    min_days: { type: Number, default: DELETION_WINDOW_BOUNDS.defaultMin },
    max_days: { type: Number, default: DELETION_WINDOW_BOUNDS.defaultMax },
    updated_by: { type: String, default: '' },
  },
  { collection: 'catalogdeletionsettings', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const CatalogDeletionSettingsModel = model<ICatalogDeletionSettings>(
  'CatalogDeletionSettings',
  settingsSchema
);
