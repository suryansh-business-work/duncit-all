import { createHash } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

/**
 * ShipRocket gateway — thin REST wrapper. Credentials are owned by the Tech
 * portal (SHIPROCKET env category), never `.env`, read fresh via
 * {@link getRuntimeEnvValue}. The auth token is cached module-side keyed on a
 * sha256 of the active email+password (the SMTP-transporter cache gotcha), so a
 * Tech-portal password rotation invalidates it automatically; a 401 forces a
 * refresh. No SDK — every call is a single REST request.
 */
const SR_BASE = 'https://apiv2.shiprocket.in/v1/external';

interface Creds {
  email: string;
  password: string;
  ttlMs: number;
}

let tokenCache: { hash: string; token: string; exp: number } | null = null;

export async function isShiprocketConfigured(): Promise<boolean> {
  const [email, password] = await Promise.all([
    getRuntimeEnvValue('SHIPROCKET_EMAIL'),
    getRuntimeEnvValue('SHIPROCKET_PASSWORD'),
  ]);
  return !!email && !!password;
}

async function getCreds(): Promise<Creds> {
  const [email, password, ttlHours] = await Promise.all([
    getRuntimeEnvValue('SHIPROCKET_EMAIL'),
    getRuntimeEnvValue('SHIPROCKET_PASSWORD'),
    getRuntimeEnvValue('SHIPROCKET_TOKEN_TTL_HOURS'),
  ]);
  if (!email || !password) {
    throw new GraphQLError('ShipRocket is not configured. Add the credentials in the Tech portal.', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
  const hours = Number(ttlHours) > 0 ? Number(ttlHours) : 240;
  return { email, password, ttlMs: hours * 3_600_000 };
}

async function login({ email, password }: Creds): Promise<string> {
  const res = await fetch(`${SR_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json().catch(() => ({}))) as { token?: string; message?: string };
  if (!res.ok || !data.token) {
    throw new GraphQLError(`ShipRocket login failed: ${data.message ?? res.status}`, {
      extensions: { code: 'BAD_GATEWAY' },
    });
  }
  return data.token;
}

async function getToken(force = false): Promise<string> {
  const creds = await getCreds();
  const hash = createHash('sha256').update(`${creds.email}:${creds.password}`).digest('hex');
  if (!force && tokenCache && tokenCache.hash === hash && tokenCache.exp > Date.now()) {
    return tokenCache.token;
  }
  const token = await login(creds);
  tokenCache = { hash, token, exp: Date.now() + creds.ttlMs };
  return token;
}

async function srRequest<T = any>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${SR_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (res.status === 401 && retry) {
    await getToken(true);
    return srRequest<T>(path, init, false);
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message ?? data?.errors ?? `ShipRocket ${res.status}`;
    throw new GraphQLError(`ShipRocket error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`, {
      extensions: { code: 'BAD_GATEWAY' },
    });
  }
  return data as T;
}

export interface AdhocOrderResult {
  order_id: string;
  shipment_id: string;
  status: string;
}

/** Create an ad-hoc (self-contained) ShipRocket order + shipment. */
export async function createOrderAdhoc(payload: Record<string, unknown>): Promise<AdhocOrderResult> {
  const data = await srRequest('/orders/create/adhoc', { method: 'POST', body: JSON.stringify(payload) });
  return {
    order_id: String(data.order_id ?? ''),
    shipment_id: String(data.shipment_id ?? ''),
    status: String(data.status ?? ''),
  };
}

export interface AwbResult {
  awb: string;
  courier_name: string;
  courier_company_id: string;
  label_url: string;
}

/** Assign the recommended courier + AWB to a shipment. */
export async function assignAwb(shipmentId: string): Promise<AwbResult> {
  const data = await srRequest('/courier/assign/awb', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: shipmentId }),
  });
  const d = data?.response?.data ?? data ?? {};
  return {
    awb: String(d.awb_code ?? ''),
    courier_name: String(d.courier_name ?? ''),
    courier_company_id: String(d.courier_company_id ?? ''),
    label_url: String(d.label_url ?? ''),
  };
}

/** Generate a shipping label for a shipment. */
export async function generateLabel(shipmentId: string): Promise<string> {
  const data = await srRequest('/courier/generate/label', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
  return String(data?.label_url ?? '');
}

export interface TrackResult {
  current_status: string;
  activities: Array<{ status: string; location: string; note: string; date: string }>;
}

/** Track a shipment by its ShipRocket shipment id. */
export async function trackByShipment(shipmentId: string): Promise<TrackResult> {
  const data = await srRequest(`/courier/track/shipment/${shipmentId}`, { method: 'GET' });
  return normaliseTracking(data);
}

/** Track a shipment by its AWB (used by the webhook + AWB lookups). */
export async function trackByAwb(awb: string): Promise<TrackResult> {
  const data = await srRequest(`/courier/track/awb/${awb}`, { method: 'GET' });
  return normaliseTracking(data);
}

export interface AddPickupResult {
  pickup_id: string;
  registered: boolean;
}

/** Register a pickup/warehouse location with ShipRocket by nickname. */
export async function addPickupLocation(payload: Record<string, unknown>): Promise<AddPickupResult> {
  const data = await srRequest('/settings/company/addpickup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return {
    pickup_id: String(data?.pickup_id ?? data?.address?.id ?? ''),
    registered: data?.success === true || !!data?.pickup_id || !!data?.address?.id,
  };
}

function normaliseTracking(data: any): TrackResult {
  const td = data?.tracking_data ?? data ?? {};
  const track = td?.shipment_track?.[0] ?? {};
  const activities = (td?.shipment_track_activities ?? []).map((a: any) => ({
    status: String(a.status ?? a['sr-status-label'] ?? ''),
    location: String(a.location ?? ''),
    note: String(a.activity ?? ''),
    date: String(a.date ?? ''),
  }));
  return {
    current_status: String(track.current_status ?? td.track_status ?? activities[0]?.status ?? ''),
    activities,
  };
}
