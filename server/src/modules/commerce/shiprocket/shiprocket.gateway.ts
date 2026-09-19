import { cacheGet, cacheSet } from '@config/redis';
import { logs } from '@observability/log';
import { srRequest, shiprocketError, type Json } from './shiprocket.client';
import { isShiprocketConfigured } from './shiprocket.account';
import { chargeableWeightKg } from './shiprocket.parcel';

export { isShiprocketConfigured } from './shiprocket.account';

/**
 * ShipRocket's REST endpoints, one function each, over the shared client
 * (auth, timeouts, retries, logging all live there). Every answer is read
 * defensively — ShipRocket nests the same field differently between
 * endpoints and versions — and reduced to the few values we store.
 */

const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
const GET = { method: 'GET' };
/** A scalar ShipRocket field as text; anything else (missing, an object) reads as ''. */
const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : '');

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

export interface AdhocOrderResult {
  order_id: string;
  shipment_id: string;
  status: string;
}

/** Create an ad-hoc order + shipment. Never retried: a repeat books a second parcel. */
export async function createOrderAdhoc(payload: Json): Promise<AdhocOrderResult> {
  const data = await srRequest('/orders/create/adhoc', post(payload), { op: 'createOrder' });
  if (!data.order_id) throw shiprocketError(`ShipRocket did not create the order: ${str(data.message) || 'no order id'}`);
  return { order_id: str(data.order_id), shipment_id: str(data.shipment_id), status: str(data.status) };
}

/**
 * The ShipRocket order already booked under our order number, if any — what
 * makes a retried "create shipment" idempotent when the first attempt reached
 * ShipRocket but never came back.
 */
export async function findOrderByChannelId(orderNo: string): Promise<AdhocOrderResult | null> {
  const data = await srRequest(`/orders?search=${encodeURIComponent(orderNo)}`, GET, { op: 'findOrder', retry: true });
  const hit = ((data.data ?? []) as Json[]).find((o) => str(o.channel_order_id) === orderNo);
  if (!hit) return null;
  const shipment = Array.isArray(hit.shipments) ? hit.shipments[0] : hit.shipments;
  return { order_id: str(hit.id), shipment_id: str(shipment?.id), status: str(hit.status) };
}

/** Cancel ShipRocket orders (their ids) before pickup. */
export async function cancelOrders(orderIds: string[]): Promise<void> {
  const ids = orderIds.map(Number).filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return;
  await srRequest('/orders/cancel', post({ ids }), { op: 'cancelOrders' });
}

/** A return (reverse pickup) order: collected from the buyer, delivered to our warehouse. */
export async function createReturnOrder(payload: Json): Promise<AdhocOrderResult> {
  const data = await srRequest('/orders/create/return', post(payload), { op: 'createReturn' });
  if (!data.order_id) throw shiprocketError(`ShipRocket did not create the return: ${str(data.message) || 'no order id'}`);
  return { order_id: str(data.order_id), shipment_id: str(data.shipment_id), status: str(data.status) };
}

/* ------------------------------------------------------------------ *
 * Couriers, AWB, pickup
 * ------------------------------------------------------------------ */

export interface CourierOption {
  courier_company_id: string;
  courier_name: string;
  rate: number;
  etd: string;
  cod: boolean;
  rating: number;
  recommended: boolean;
}

const rateOf = (c: Json): number => Number(c?.rate ?? c?.freight_charge ?? c?.total_charge ?? 0) || 0;

function courierOptions(data: Json): CourierOption[] {
  const inner = data?.data ?? {};
  const recommended = str(inner.recommended_courier_company_id ?? inner.shiprocket_recommended_courier_id);
  return ((inner.available_courier_companies ?? []) as Json[]).map((c) => ({
    courier_company_id: str(c.courier_company_id),
    courier_name: str(c.courier_name),
    rate: rateOf(c),
    etd: str(c.etd ?? c.estimated_delivery_days),
    cod: Number(c.cod) === 1 || c.cod === true,
    rating: Number(c.rating) || 0,
    recommended: str(c.courier_company_id) === recommended,
  }));
}

/** The couriers that can carry an existing ShipRocket order, the recommended one flagged. */
export async function couriersForOrder(srOrderId: string): Promise<CourierOption[]> {
  const data = await srRequest(`/courier/serviceability/?order_id=${encodeURIComponent(srOrderId)}`, GET, {
    op: 'couriersForOrder',
    retry: true,
  });
  return courierOptions(data).sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.rate - b.rate);
}

export interface AwbResult {
  awb: string;
  courier_name: string;
  courier_company_id: string;
  label_url: string;
}

/** Assign an AWB — with the courier the admin picked, else ShipRocket's recommendation. */
export async function assignAwb(shipmentId: string, courierId?: string | null, isReturn = false): Promise<AwbResult> {
  const body: Json = { shipment_id: shipmentId };
  if (courierId) body.courier_id = courierId;
  if (isReturn) body.is_return = 1;
  const data = await srRequest('/courier/assign/awb', post(body), { op: 'assignAwb' });
  const d = data?.response?.data ?? data ?? {};
  if (Number(data?.awb_assign_status) === 0 || !d.awb_code) {
    throw shiprocketError(`ShipRocket could not assign an AWB: ${str(d.awb_assign_error ?? data?.message) || 'no AWB returned'}`);
  }
  return {
    awb: str(d.awb_code),
    courier_name: str(d.courier_name),
    courier_company_id: str(d.courier_company_id),
    label_url: str(d.label_url),
  };
}

export interface PickupResult {
  token: string;
  scheduled_date: string;
}

/** Ask the courier to collect the shipment. */
export async function generatePickup(shipmentId: string): Promise<PickupResult> {
  const data = await srRequest('/courier/generate/pickup', post({ shipment_id: [Number(shipmentId)] }), {
    op: 'generatePickup',
  });
  const r = data?.response ?? {};
  return { token: str(r.pickup_token_number), scheduled_date: str(r.pickup_scheduled_date) };
}

/* ------------------------------------------------------------------ *
 * Documents
 * ------------------------------------------------------------------ */

/** Shipping label PDF for one or more shipments. */
export async function generateLabel(shipmentIds: string[]): Promise<string> {
  const data = await srRequest('/courier/generate/label', post({ shipment_id: shipmentIds.map(Number) }), {
    op: 'generateLabel',
    retry: true,
  });
  if (!data.label_url) throw shiprocketError(`ShipRocket did not create the label: ${str(data.message) || 'no URL'}`);
  return str(data.label_url);
}

/** GST invoice PDF for one or more ShipRocket orders. */
export async function printInvoice(srOrderIds: string[]): Promise<string> {
  const data = await srRequest('/orders/print/invoice', post({ ids: srOrderIds.map(Number) }), {
    op: 'printInvoice',
    retry: true,
  });
  if (!data.invoice_url) throw shiprocketError(`ShipRocket did not create the invoice: ${str(data.message) || 'no URL'}`);
  return str(data.invoice_url);
}

/**
 * Pickup manifest PDF. The first call generates it; ShipRocket refuses a
 * second generate for the same shipments, so that case prints the existing one.
 */
export async function manifestFor(shipmentIds: string[], srOrderIds: string[]): Promise<string> {
  try {
    const data = await srRequest('/manifests/generate', post({ shipment_id: shipmentIds.map(Number) }), {
      op: 'generateManifest',
    });
    if (data.manifest_url) return str(data.manifest_url);
  } catch (error) {
    if (!/already/i.test((error as Error).message)) throw error;
  }
  const printed = await srRequest('/manifests/print', post({ order_ids: srOrderIds.map(Number) }), {
    op: 'printManifest',
    retry: true,
  });
  if (!printed.manifest_url) throw shiprocketError('ShipRocket did not return the manifest');
  return str(printed.manifest_url);
}

/** Where ShipRocket serves its PDFs from. A stored link is only ever fetched from these. */
const DOCUMENT_HOSTS = ['amazonaws.com', 'shiprocket.in', 'shiprocket.co', 'cloudfront.net'];
const DOCUMENT_TIMEOUT_MS = 30_000;
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

const trustedDocumentUrl = (raw: string): URL | null => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const trusted = url.protocol === 'https:' && DOCUMENT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  return trusted ? url : null;
};

/**
 * The bytes behind a ShipRocket document link, as base64. The console prints
 * and saves the PDF itself — a browser can neither print a cross-origin link
 * in place nor save it under our file name — so the server fetches it, and
 * only from ShipRocket's own storage.
 */
export async function fetchDocumentPdf(link: string): Promise<string> {
  const url = trustedDocumentUrl(link);
  if (!url) throw shiprocketError('ShipRocket returned a document link we do not download from');
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(DOCUMENT_TIMEOUT_MS) });
  } catch (error) {
    logs.server.warn('shiprocket', 'fetchDocument', { error, host: url.hostname, msg: 'document download failed' });
    throw shiprocketError('The document could not be downloaded from ShipRocket — try again shortly');
  }
  if (!res.ok || !trustedDocumentUrl(res.url || url.href)) {
    throw shiprocketError(`The document could not be downloaded from ShipRocket (HTTP ${res.status})`, res.status);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_DOCUMENT_BYTES || bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw shiprocketError('ShipRocket did not return a PDF for this document');
  }
  return bytes.toString('base64');
}

/* ------------------------------------------------------------------ *
 * Tracking and NDR
 * ------------------------------------------------------------------ */

/** ShipRocket dates are Indian local time without a zone ("2026-09-19 14:05:11"). */
export function parseShiprocketDate(raw: string): Date | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const iso = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(s) ? s : `${s.replace(' ', 'T')}+05:30`;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : at;
}

export interface TrackActivity {
  status: string;
  location: string;
  note: string;
  date: string;
}

export interface TrackResult {
  current_status: string;
  status_id: number;
  etd: string;
  activities: TrackActivity[];
}

function normaliseTracking(data: Json): TrackResult {
  const td = data?.tracking_data ?? data ?? {};
  const track = td?.shipment_track?.[0] ?? {};
  const activities = ((td?.shipment_track_activities ?? []) as Json[]).map((a) => ({
    status: str(a['sr-status-label'] ?? a.status),
    location: str(a.location),
    note: str(a.activity),
    date: str(a.date),
  }));
  return {
    current_status: str(track.current_status ?? td.track_status ?? activities[0]?.status),
    status_id: Number(td.shipment_status ?? track.shipment_status) || 0,
    etd: str(td.etd ?? track.edd),
    activities,
  };
}

/** Track by AWB (the polling fallback and admin refresh). */
export async function trackByAwb(awb: string): Promise<TrackResult> {
  const data = await srRequest(`/courier/track/awb/${encodeURIComponent(awb)}`, GET, { op: 'trackAwb', retry: true });
  return normaliseTracking(data);
}

/** Track by ShipRocket shipment id — before an AWB exists. */
export async function trackByShipment(shipmentId: string): Promise<TrackResult> {
  const data = await srRequest(`/courier/track/shipment/${encodeURIComponent(shipmentId)}`, GET, {
    op: 'trackShipment',
    retry: true,
  });
  return normaliseTracking(data);
}

export type NdrAction = 're-attempt' | 'return';

/** Answer a failed delivery: try again, or send the parcel back (RTO). */
export async function ndrAction(awb: string, action: NdrAction, comments: string): Promise<void> {
  await srRequest(`/ndr/${encodeURIComponent(awb)}/action`, post({ action, comments }), { op: 'ndrAction' });
}

/* ------------------------------------------------------------------ *
 * Account: pickup locations, wallet
 * ------------------------------------------------------------------ */

export interface AddPickupResult {
  pickup_id: string;
  registered: boolean;
}

/** Register a pickup / warehouse location by nickname. */
export async function addPickupLocation(payload: Json): Promise<AddPickupResult> {
  const data = await srRequest('/settings/company/addpickup', post(payload), { op: 'addPickup' });
  return {
    pickup_id: str(data?.pickup_id ?? data?.address?.id),
    registered: data?.success === true || !!data?.pickup_id || !!data?.address?.id,
  };
}

export interface ShiprocketPickup {
  id: string;
  nickname: string;
  name: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  /** ShipRocket verifies a new pickup address (phone OTP) before it can be used. */
  verified: boolean;
}

/** Every pickup location on the ShipRocket account. */
export async function listPickupLocations(): Promise<ShiprocketPickup[]> {
  const data = await srRequest('/settings/company/pickup', GET, { op: 'listPickups', retry: true });
  return ((data?.data?.shipping_address ?? []) as Json[]).map((p) => ({
    id: str(p.id),
    nickname: str(p.pickup_location),
    name: str(p.name),
    email: str(p.email),
    address_line1: str(p.address),
    address_line2: str(p.address_2),
    city: str(p.city),
    state: str(p.state),
    pincode: str(p.pin_code),
    phone: str(p.phone),
    verified: Number(p.phone_verified) === 1 || Number(p.status) === 2,
  }));
}

/** The prepaid wallet ShipRocket debits for every AWB. */
export async function walletBalance(): Promise<number> {
  const data = await srRequest('/account/details/wallet-balance', GET, { op: 'walletBalance', retry: true });
  return Number(data?.data?.balance_amount ?? data?.balance_amount) || 0;
}

/* ------------------------------------------------------------------ *
 * Serviceability
 * ------------------------------------------------------------------ */

export interface ServiceabilityQuote {
  serviceable: boolean;
  courier_name: string;
  courier_company_id: string;
  freight_charge: number;
  etd: string;
}

export interface ServiceabilityArgs {
  pickupPincode: string;
  deliveryPincode: string;
  weightKg: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
  cod?: boolean;
  /** Goods value — insurance and the COD charge are worked out from it. */
  declaredValue?: number;
}

/** Rates are cached per lane, weight slab and COD for this long. */
const QUOTE_TTL_SECONDS = 6 * 3600;
/** Weight slab the cache is keyed on — couriers price in half-kilo steps. */
const SLAB_KG = 0.5;

/** The chargeable weight rounded UP to its slab: the weight we ask for and cache under. */
export const weightSlab = (args: ServiceabilityArgs) => {
  const chargeable = chargeableWeightKg({
    weight_kg: args.weightKg,
    length_cm: args.lengthCm ?? 0,
    breadth_cm: args.breadthCm ?? 0,
    height_cm: args.heightCm ?? 0,
  });
  return Math.max(SLAB_KG, Math.ceil(chargeable / SLAB_KG) * SLAB_KG);
};

async function lookupServiceability(args: ServiceabilityArgs, slab: number): Promise<ServiceabilityQuote | null> {
  const params = new URLSearchParams({
    pickup_postcode: args.pickupPincode,
    delivery_postcode: args.deliveryPincode,
    weight: String(slab),
    cod: args.cod ? '1' : '0',
  });
  if (args.lengthCm) params.set('length', String(args.lengthCm));
  if (args.breadthCm) params.set('breadth', String(args.breadthCm));
  if (args.heightCm) params.set('height', String(args.heightCm));
  if (args.declaredValue) params.set('declared_value', String(Math.round(args.declaredValue)));
  let data: Json;
  try {
    data = await srRequest(`/courier/serviceability/?${params.toString()}`, GET, { op: 'serviceability', retry: true });
  } catch (error) {
    // ShipRocket answers an unreachable lane with a 404, not an empty list.
    if ((error as { extensions?: Json }).extensions?.shiprocket_status === 404) return null;
    throw error;
  }
  const couriers = courierOptions(data);
  if (couriers.length === 0) return null;
  const cheapest = couriers.reduce((min, c) => (c.rate < min.rate ? c : min), couriers[0]);
  return {
    serviceable: true,
    courier_name: cheapest.courier_name,
    courier_company_id: cheapest.courier_company_id,
    freight_charge: cheapest.rate,
    etd: cheapest.etd,
  };
}

/**
 * The cheapest courier for a lane and parcel, or null when none serves it (or
 * ShipRocket is not configured — callers fall back to the store's flat fee).
 * Answers are cached for six hours per pickup, delivery pincode, weight slab
 * and COD; a gateway failure is never cached.
 */
export async function getServiceability(args: ServiceabilityArgs): Promise<ServiceabilityQuote | null> {
  if (!(await isShiprocketConfigured())) return null;
  const slab = weightSlab(args);
  const key = `sr:svc:${args.pickupPincode}:${args.deliveryPincode}:${slab}:${args.cod ? 1 : 0}`;
  const cached = await cacheGet<{ quote: ServiceabilityQuote | null }>(key);
  if (cached) return cached.quote;
  const quote = await lookupServiceability(args, slab);
  await cacheSet(key, { quote }, QUOTE_TTL_SECONDS);
  return quote;
}
