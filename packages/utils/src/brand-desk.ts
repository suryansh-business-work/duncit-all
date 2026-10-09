import type { FulfilmentTone } from './product-orders';

/**
 * The brand's desk in the apps — Brand Orders and ShipRocket Warehouses, which
 * mWeb and the native Studio both render. What decides anything lives here so
 * the two cannot drift: which page of orders to ask for, and how a warehouse's
 * ShipRocket standing reads.
 */

/** Orders per page on the apps' Brand Orders list. */
export const BRAND_ORDERS_PAGE_SIZE = 20;

/** What the Brand Orders list is showing right now. */
export interface BrandOrdersView {
  /** 1-based. */
  page: number;
  /** One fulfilment status, or '' for every order. */
  status?: string;
  /** Order no., buyer or AWB — the server searches all three. */
  search?: string;
  pageSize?: number;
}

/** A shared-table-engine filter (`TableFilterInput`). */
export interface BrandOrdersFilter {
  field: string;
  op: 'eq';
  value: string;
}

/** The `TableQueryInput` the `brandProductOrdersTable` query takes — newest first. */
export interface BrandOrdersTableQuery {
  page: number;
  page_size: number;
  search?: string;
  sort_by: 'created_at';
  sort_dir: 'desc';
  filters: BrandOrdersFilter[];
}

/** The `query` variable for one view of the brand's orders. */
export function brandOrdersTableQuery(view: Readonly<BrandOrdersView>): BrandOrdersTableQuery {
  const search = view.search?.trim();
  return {
    page: Math.max(1, Math.floor(view.page)),
    page_size: view.pageSize ?? BRAND_ORDERS_PAGE_SIZE,
    ...(search ? { search } : {}),
    sort_by: 'created_at',
    sort_dir: 'desc',
    filters: view.status ? [{ field: 'fulfilment_status', op: 'eq', value: view.status }] : [],
  };
}

/** How many pages `total` orders make (at least one, so a pager never reads "of 0"). */
export function brandOrdersPageCount(total: number, pageSize = BRAND_ORDERS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** An order's ship-to as the server sends it. */
export interface ShipToAddress {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

/** The ship-to as the lines of a label — blank parts dropped, never an empty line. */
export function shipToLines(a: Readonly<ShipToAddress>): string[] {
  const join = (parts: string[], sep: string) => parts.filter(Boolean).join(sep);
  return [
    a.name,
    a.phone,
    join([a.line1, a.line2, a.landmark], ', '),
    join([join([a.city, a.state], ', '), a.pincode], ' '),
    a.country,
  ].filter(Boolean);
}

/** Where a warehouse stands with ShipRocket. */
export type PickupShiprocketState = 'REGISTERED' | 'AWAITING_VERIFICATION' | 'NOT_IN_SHIPROCKET';

/** The warehouse facts the state is read from. */
export interface PickupShiprocketFacts {
  shiprocket_registered: boolean;
  /** Why it is not ready ('' when it is). */
  shiprocket_error: string;
}

/**
 * Registered with no complaint is ready to ship from. Registered with one is a
 * pickup ShipRocket holds but has not verified (its phone check). Not
 * registered is a warehouse ShipRocket has no pickup address for.
 */
export function pickupShiprocketState(w: Readonly<PickupShiprocketFacts>): PickupShiprocketState {
  if (!w.shiprocket_registered) return 'NOT_IN_SHIPROCKET';
  return w.shiprocket_error ? 'AWAITING_VERIFICATION' : 'REGISTERED';
}

/** Localization keys for each state. */
export const PICKUP_SHIPROCKET_STATE_KEYS: Readonly<Record<PickupShiprocketState, string>> = {
  REGISTERED: 'mweb.brandWarehouses.stateRegistered',
  AWAITING_VERIFICATION: 'mweb.brandWarehouses.stateAwaitingVerification',
  NOT_IN_SHIPROCKET: 'mweb.brandWarehouses.stateNotInShiprocket',
};

/** The approval gate a partner warehouse passes before it can ship. */
export type PickupReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const REVIEW_KEYS: Readonly<Record<PickupReviewStatus, string>> = {
  PENDING: 'mweb.brandWarehouses.reviewPending',
  APPROVED: 'mweb.brandWarehouses.reviewApproved',
  REJECTED: 'mweb.brandWarehouses.reviewRejected',
};

const REVIEW_TONE: Readonly<Record<PickupReviewStatus, FulfilmentTone>> = {
  PENDING: 'pending',
  APPROVED: 'done',
  REJECTED: 'failed',
};

/** A review status the apps do not know yet reads as still waiting — never as approved. */
const reviewOf = (status: string): PickupReviewStatus =>
  status in REVIEW_KEYS ? (status as PickupReviewStatus) : 'PENDING';

/** The localization key and chip tone for a warehouse's review status. */
export function pickupReview(status: string): { key: string; tone: FulfilmentTone } {
  const review = reviewOf(status);
  return { key: REVIEW_KEYS[review], tone: REVIEW_TONE[review] };
}

/** Each state's chip tone — the same vocabulary the order status chips use. */
export const PICKUP_SHIPROCKET_TONE: Readonly<Record<PickupShiprocketState, FulfilmentTone>> = {
  REGISTERED: 'done',
  AWAITING_VERIFICATION: 'pending',
  NOT_IN_SHIPROCKET: 'failed',
};

/** A ShipRocket document a brand can print or save from an order. */
export type ShipmentDocumentKind = 'LABEL' | 'INVOICE' | 'MANIFEST';

/** The order's documents, in the order a packer reaches for them, with each one's two actions. */
export const SHIPMENT_DOCUMENTS: ReadonlyArray<{
  kind: ShipmentDocumentKind;
  printKey: string;
  downloadKey: string;
}> = [
  { kind: 'LABEL', printKey: 'mweb.brandOrders.printLabel', downloadKey: 'mweb.brandOrders.downloadLabel' },
  { kind: 'INVOICE', printKey: 'mweb.brandOrders.printInvoice', downloadKey: 'mweb.brandOrders.downloadInvoice' },
  { kind: 'MANIFEST', printKey: 'mweb.brandOrders.printManifest', downloadKey: 'mweb.brandOrders.downloadManifest' },
];
